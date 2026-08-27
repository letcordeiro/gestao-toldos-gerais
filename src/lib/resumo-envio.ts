import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { resumos } from "@/db/schema";
import { emailConfigurado, enviarEmail } from "@/lib/email";
import { montarEmail, montarSecoes } from "@/lib/resumo-conteudo";
import {
  estaNaHora,
  lerBlocos,
  lerDestinatarios,
  separarDestinatarios,
} from "@/lib/resumo";
import { urlBase } from "@/lib/url";

export type ResultadoEnvio = {
  id: number;
  nome: string;
  enviado: boolean;
  motivo?: string;
};

/**
 * Manda um resumo. `forcar` ignora a frequência — é o botão "enviar agora"
 * da tela, para testar sem esperar o cron.
 */
export async function enviarResumo(
  id: number,
  forcar = false
): Promise<ResultadoEnvio> {
  const resumo = await db.query.resumos.findFirst({
    where: eq(resumos.id, id),
  });
  if (!resumo) return { id, nome: "?", enviado: false, motivo: "não encontrado" };

  const base = { id: resumo.id, nome: resumo.nome };

  if (!resumo.ativo && !forcar)
    return { ...base, enviado: false, motivo: "desativado" };
  if (!forcar && !estaNaHora(resumo.frequencia, resumo.ultimoEnvioEm))
    return { ...base, enviado: false, motivo: "ainda não é a hora" };
  if (!emailConfigurado())
    return { ...base, enviado: false, motivo: "SMTP não configurado" };

  const destinatarios = lerDestinatarios(resumo.destinatarios);
  const { para, copia, oculta } = separarDestinatarios(destinatarios);
  if (para.length === 0)
    return { ...base, enviado: false, motivo: "sem destinatário em Para" };

  const secoes = await montarSecoes(lerBlocos(resumo.blocos));
  const { assunto, html, texto } = montarEmail({
    nome: resumo.nome,
    secoes,
    mensagem: resumo.mensagem,
    urlSistema: await urlBase(),
  });

  await enviarEmail({ para, copia, copiaOculta: oculta, assunto, html, texto });

  // Só marca depois de enviar: se o envio falhar, a próxima chamada tenta de
  // novo em vez de pular o período.
  await db
    .update(resumos)
    .set({ ultimoEnvioEm: new Date() })
    .where(eq(resumos.id, resumo.id));

  return { ...base, enviado: true };
}

/** Passa por todos os resumos ativos e manda os que estão na hora. */
export async function enviarResumosPendentes(): Promise<ResultadoEnvio[]> {
  const lista = await db
    .select({ id: resumos.id })
    .from(resumos)
    .where(eq(resumos.ativo, true))
    .orderBy(asc(resumos.id));

  const resultados: ResultadoEnvio[] = [];
  for (const r of lista) {
    try {
      resultados.push(await enviarResumo(r.id));
    } catch (e) {
      resultados.push({
        id: r.id,
        nome: "?",
        enviado: false,
        motivo: e instanceof Error ? e.message : "erro no envio",
      });
    }
  }
  return resultados;
}
