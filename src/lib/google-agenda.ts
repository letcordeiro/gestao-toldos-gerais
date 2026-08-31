import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agendasGoogle } from "@/db/schema";
import { cifrar, decifrar, temChaveDeCripto } from "@/lib/cripto";
import { lerFreeBusy } from "@/lib/google-freebusy";
import type { Intervalo } from "@/lib/disponibilidade";

/**
 * Conversa com o Google Agenda.
 *
 * SÓ LEITURA. O escopo pedido é `calendar.readonly` e o sistema nunca cria nem
 * altera evento de ninguém — a agenda pessoal do vendedor é dele. O que
 * usamos é o "free/busy": o Google devolve apenas OS HORÁRIOS ocupados, sem
 * título nem convidado, que é exatamente o que a atendente precisa saber e
 * nada além disso.
 */

const AUTORIZAR = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const FREEBUSY = "https://www.googleapis.com/calendar/v3/freeBusy";
const USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";
const ESCOPO = "https://www.googleapis.com/auth/calendar.readonly email";

/** Configuração completa? Sem isso a integração nem aparece na tela. */
export function googleConfigurado(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.APP_URL &&
      temChaveDeCripto()
  );
}

export function urlDeRetorno(): string {
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  return `${base}/api/google/callback`;
}

/**
 * Para onde mandar o vendedor para autorizar.
 *
 * `access_type=offline` + `prompt=consent` são os dois que fazem o Google
 * devolver um refresh token. Sem eles, a conexão vale uma hora e morre — e o
 * segundo é necessário mesmo em reconexão, porque o Google só manda o refresh
 * token na PRIMEIRA autorização de cada conta, a não ser que se force.
 */
export function urlDeAutorizacao(estado: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: urlDeRetorno(),
    response_type: "code",
    scope: ESCOPO,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: estado,
  });
  return `${AUTORIZAR}?${p.toString()}`;
}

type RespostaToken = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function pedirToken(corpo: Record<string, string>): Promise<RespostaToken> {
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...corpo,
    }),
  });
  return (await r.json()) as RespostaToken;
}

/** Guarda a conexão do vendedor. Conectar de novo substitui a anterior. */
export async function salvarConexao(
  vendedorId: number,
  codigo: string
): Promise<{ erro?: string }> {
  const t = await pedirToken({
    code: codigo,
    redirect_uri: urlDeRetorno(),
    grant_type: "authorization_code",
  });
  if (t.error || !t.access_token) {
    return { erro: t.error_description ?? t.error ?? "Google recusou o código" };
  }
  if (!t.refresh_token) {
    // Acontece quando a conta já autorizou antes e o Google não reenvia. Como
    // pedimos prompt=consent, é sinal de algo fora do padrão — melhor recusar
    // do que gravar uma conexão que morre em uma hora sem avisar.
    return {
      erro:
        "O Google não devolveu a autorização de longo prazo. " +
        "Remova o acesso do app na sua Conta Google e conecte de novo.",
    };
  }

  const email = await emailDaConta(t.access_token);
  if (!email) return { erro: "Não deu para ler o e-mail da conta Google" };

  const linha = {
    vendedorId,
    googleEmail: email,
    refreshToken: cifrar(t.refresh_token),
    accessToken: cifrar(t.access_token),
    accessTokenExpiraEm: expiraEm(t.expires_in),
    ultimoErro: null,
    conectadoEm: new Date(),
  };
  await db
    .insert(agendasGoogle)
    .values(linha)
    .onConflictDoUpdate({ target: agendasGoogle.vendedorId, set: linha });
  return {};
}

export async function desconectar(vendedorId: number): Promise<void> {
  await db.delete(agendasGoogle).where(eq(agendasGoogle.vendedorId, vendedorId));
}

export type ConexaoAgenda = {
  googleEmail: string;
  conectadoEm: Date;
  ultimoErro: string | null;
};

export async function conexaoDoVendedor(
  vendedorId: number
): Promise<ConexaoAgenda | null> {
  const linha = await db.query.agendasGoogle.findFirst({
    where: eq(agendasGoogle.vendedorId, vendedorId),
  });
  if (!linha) return null;
  return {
    googleEmail: linha.googleEmail,
    conectadoEm: linha.conectadoEm,
    ultimoErro: linha.ultimoErro,
  };
}

/** Vendedores com agenda conectada — para a tela marcar quem tem. */
export async function vendedoresConectados(): Promise<Set<number>> {
  const linhas = await db
    .select({ vendedorId: agendasGoogle.vendedorId })
    .from(agendasGoogle);
  return new Set(linhas.map((l) => l.vendedorId));
}

export type ResultadoOcupados =
  | { estado: "ok"; ocupados: Intervalo[] }
  | { estado: "sem_conexao" }
  | { estado: "erro"; mensagem: string };

/**
 * Horários ocupados do vendedor entre duas datas.
 *
 * Distingue "não conectou" de "deu erro" de propósito: as duas coisas
 * resultariam numa agenda vazia na tela, e agenda vazia por engano faz a
 * atendente marcar visita em cima de outro compromisso.
 */
export async function ocupadosDoVendedor(
  vendedorId: number,
  de: Date,
  ate: Date
): Promise<ResultadoOcupados> {
  if (!googleConfigurado()) return { estado: "sem_conexao" };

  const linha = await db.query.agendasGoogle.findFirst({
    where: eq(agendasGoogle.vendedorId, vendedorId),
  });
  if (!linha) return { estado: "sem_conexao" };

  const token = await tokenValido(vendedorId, linha);
  if (!token) {
    return {
      estado: "erro",
      mensagem: "A conexão com o Google expirou. Reconecte a agenda no perfil.",
    };
  }

  try {
    const r = await fetch(FREEBUSY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: de.toISOString(),
        timeMax: ate.toISOString(),
        items: [{ id: "primary" }],
      }),
    });
    if (!r.ok) {
      const msg = `Google respondeu ${r.status}`;
      await registrarErro(vendedorId, msg);
      return { estado: "erro", mensagem: msg };
    }
    const dados = (await r.json()) as unknown;
    await registrarErro(vendedorId, null);
    return { estado: "ok", ocupados: lerFreeBusy(dados) };
  } catch {
    const msg = "Não deu para falar com o Google agora.";
    await registrarErro(vendedorId, msg);
    return { estado: "erro", mensagem: msg };
  }
}


// --- internos ---------------------------------------------------------------

function expiraEm(segundos: number | undefined): Date {
  // 60s de folga: token que vence no meio da requisição dá erro difícil de ler.
  return new Date(Date.now() + ((segundos ?? 3600) - 60) * 1000);
}

async function emailDaConta(accessToken: string): Promise<string | null> {
  try {
    const r = await fetch(USERINFO, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { email?: string };
    return d.email ?? null;
  } catch {
    return null;
  }
}

type LinhaAgenda = typeof agendasGoogle.$inferSelect;

/** Access token ainda válido, renovando pelo refresh token quando preciso. */
async function tokenValido(
  vendedorId: number,
  linha: LinhaAgenda
): Promise<string | null> {
  const guardado = linha.accessToken ? decifrar(linha.accessToken) : null;
  if (
    guardado &&
    linha.accessTokenExpiraEm &&
    linha.accessTokenExpiraEm.getTime() > Date.now()
  ) {
    return guardado;
  }

  const refresh = decifrar(linha.refreshToken);
  if (!refresh) return null;

  const t = await pedirToken({
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  if (t.error || !t.access_token) {
    await registrarErro(vendedorId, t.error_description ?? "acesso revogado");
    return null;
  }

  await db
    .update(agendasGoogle)
    .set({
      accessToken: cifrar(t.access_token),
      accessTokenExpiraEm: expiraEm(t.expires_in),
      ultimoErro: null,
    })
    .where(eq(agendasGoogle.vendedorId, vendedorId));
  return t.access_token;
}

async function registrarErro(vendedorId: number, msg: string | null) {
  await db
    .update(agendasGoogle)
    .set({ ultimoErro: msg })
    .where(eq(agendasGoogle.vendedorId, vendedorId));
}
