"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  vendedores,
  visitas,
} from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import { enderecoCompleto } from "@/lib/endereco";
import {
  horariosLivres,
  janelaDoDia,
  juntarIntervalos,
  textoDoIntervalo,
  type Intervalo,
} from "@/lib/disponibilidade";
import { ocupadosDoVendedor } from "@/lib/google-agenda";
import { SITUACOES_EM_PE } from "@/lib/visitas";

const visitaSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  atendimentoId: z.coerce.number().int().positive(),
  // <input type="datetime-local"> manda "2026-09-01T09:00"
  inicio: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Informe data e hora"),
  duracaoMin: z.coerce.number().int().min(15).max(600),
  endereco: z.string().trim().max(300).transform((v) => v || null),
  observacoes: z.string().trim().max(2000).transform((v) => v || null),
  vendedorId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v)),
});

export type VisitaFormState = { ok?: boolean; erro?: string };

function paraData(local: string): Date {
  // "2026-09-01T09:00" no fuso de quem digitou — que é o fuso da obra.
  const [data, hora] = local.split("T");
  const [a, m, d] = data.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return new Date(a, m - 1, d, h, min);
}

export async function salvarVisita(
  _prev: VisitaFormState,
  formData: FormData
): Promise<VisitaFormState> {
  const usuario = await exigirUsuario();
  const ehAtendente = usuario.papel === "atendente";

  const parsed = visitaSchema.safeParse({
    id: formData.get("id") || undefined,
    atendimentoId: formData.get("atendimentoId"),
    inicio: formData.get("inicio"),
    duracaoMin: formData.get("duracaoMin") ?? 60,
    endereco: formData.get("endereco") ?? "",
    observacoes: formData.get("observacoes") ?? "",
    vendedorId: formData.get("vendedorId") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  // Quem VAI na visita. O atendente marca a agenda dos outros: ele não é
  // responsável por visita nenhuma, então precisa dizer quem vai — cair no
  // "eu mesma" colocaria a visita no nome de quem não sai da mesa.
  const responsavel = d.vendedorId ?? (ehAtendente ? null : usuario.vendedorId ?? null);
  if (responsavel == null && ehAtendente) {
    return { erro: "Escolha quem vai na visita." };
  }

  const valores = {
    inicioEm: paraData(d.inicio),
    duracaoMin: d.duracaoMin,
    endereco: d.endereco,
    observacoes: d.observacoes,
    vendedorId: responsavel,
  };

  if (d.id) {
    await db.update(visitas).set(valores).where(eq(visitas.id, d.id));
  } else {
    await db.insert(visitas).values({
      atendimentoId: d.atendimentoId,
      ...valores,
      criadoPor: usuario.nome ?? usuario.email,
    });
  }

  revalidar(d.atendimentoId);
  return { ok: true };
}

export async function mudarSituacaoVisita(
  visitaId: number,
  situacao: string
): Promise<{ erro?: string }> {
  await exigirUsuario();
  const id = z.coerce.number().int().positive().parse(visitaId);
  const nova = z
    .enum(["agendada", "confirmada", "realizada", "cancelada", "nao_compareceu"])
    .parse(situacao);

  const visita = await db.query.visitas.findFirst({ where: eq(visitas.id, id) });
  if (!visita) return { erro: "Visita não encontrada" };

  await db.update(visitas).set({ situacao: nova }).where(eq(visitas.id, id));
  revalidar(visita.atendimentoId);
  return {};
}

export async function excluirVisita(visitaId: number) {
  await exigirUsuario();
  const id = z.coerce.number().int().positive().parse(visitaId);
  const visita = await db.query.visitas.findFirst({ where: eq(visitas.id, id) });
  await db.delete(visitas).where(eq(visitas.id, id));
  if (visita) revalidar(visita.atendimentoId);
}

/** Endereço do cliente, para já vir preenchido ao agendar. */
export async function enderecoDoAtendimento(
  atendimentoId: number
): Promise<string> {
  await exigirUsuario();
  const id = z.coerce.number().int().positive().parse(atendimentoId);
  const [linha] = await db
    .select({ cliente: clientes })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(eq(atendimentos.id, id));
  return linha ? enderecoCompleto(linha.cliente) || "" : "";
}

/** Responsáveis que podem receber uma visita. */
/**
 * Quem pode receber uma visita. Vazio para o vendedor (a visita é dele
 * mesmo); preenchido para gestor e atendente, que agendam para os outros.
 */
export async function responsaveisDeVisita() {
  const usuario = await exigirUsuario();
  if (!veFunilInteiro(usuario.papel)) return [];
  const lista = await db
    .select({ id: vendedores.id, nome: vendedores.nome, papel: vendedores.papel })
    .from(vendedores)
    .where(eq(vendedores.ativo, true))
    .orderBy(asc(vendedores.nome));
  return lista
    .filter((v) => v.papel !== "atendente")
    .map((v) => ({ id: v.id, nome: v.nome }));
}

function revalidar(atendimentoId: number) {
  revalidatePath("/visitas");
  revalidatePath("/painel");
  revalidatePath(`/atendimentos/${atendimentoId}`);
}


/**
 * Atendimentos que podem receber visita: cliente ativo e negócio ainda em
 * andamento. Fase terminal (concluído/perdido) fica de fora — visita em
 * negócio encerrado é engano de digitação, não agenda.
 */
export async function atendimentosParaVisita() {
  const usuario = await exigirUsuario();
  const filtros: (SQL | undefined)[] = [
    eq(clientes.ativo, true),
    eq(fases.terminal, false),
  ];
  if (!veFunilInteiro(usuario.papel) && usuario.vendedorId != null) {
    filtros.push(eq(atendimentos.vendedorId, usuario.vendedorId));
  }

  return db
    .select({
      id: atendimentos.id,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      faseNome: fases.nome,
    })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .where(and(...filtros))
    .orderBy(asc(clientes.nome));
}

export type DisponibilidadeDoDia = {
  estado: "ok" | "sem_conexao" | "erro";
  /** Faixas livres, já formatadas ("09:00 às 11:30"). */
  livres: string[];
  /**
   * Faixas ocupadas que quem está olhando TEM DIREITO de ver.
   *
   * Para o dono da agenda, tudo. Para os outros — a atendente marcando visita
   * para o vendedor —, só as visitas de cliente marcadas neste sistema, que já
   * são informação de trabalho e aparecem na tela de Visitas de qualquer jeito.
   * Compromisso particular do Google NUNCA sai daqui: ele encolhe o horário
   * livre e pronto. Devolver "ocupado das 19h às 22h, terça e quinta" é contar
   * a vida de fora do trabalho de quem só emprestou a agenda.
   */
  ocupados: string[];
  /** Verdadeiro quando há particular escondido — a tela explica o buraco. */
  temParticularOculto: boolean;
  mensagem?: string;
};

/**
 * O que sobra livre na agenda de um vendedor num dia.
 *
 * Junta DUAS fontes: os compromissos do Google e as visitas já marcadas neste
 * sistema. Só a do Google deixaria a atendente marcar duas visitas no mesmo
 * horário; só a daqui ignoraria o dentista da tarde.
 *
 * A visita que está sendo EDITADA não conta como ocupada — senão ela bloqueia
 * o próprio horário e a tela diz que não cabe.
 */
export async function disponibilidadeDoDia(
  vendedorId: number | null,
  diaISO: string,
  duracaoMin: number,
  ignorarVisitaId?: number
): Promise<DisponibilidadeDoDia> {
  const usuario = await exigirUsuario();
  const alvo = vendedorId ?? usuario.vendedorId;
  if (alvo == null)
    return { estado: "sem_conexao", livres: [], ocupados: [], temParticularOculto: false };

  const [ano, mes, dia] = diaISO.split("-").map(Number);
  if (!ano || !mes || !dia) {
    return { estado: "sem_conexao", livres: [], ocupados: [], temParticularOculto: false };
  }
  const data = new Date(ano, mes - 1, dia);
  const janela = janelaDoDia(data);
  const inicioDoDia = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
  const fimDoDia = new Date(ano, mes - 1, dia, 23, 59, 59, 999);

  // Visitas já marcadas aqui dentro, do mesmo vendedor, no mesmo dia.
  const marcadas = await db
    .select({
      id: visitas.id,
      inicioEm: visitas.inicioEm,
      duracaoMin: visitas.duracaoMin,
    })
    .from(visitas)
    .where(
      and(
        eq(visitas.vendedorId, alvo),
        inArray(visitas.situacao, SITUACOES_EM_PE),
        gte(visitas.inicioEm, inicioDoDia),
        lte(visitas.inicioEm, fimDoDia)
      )
    );

  const ocupados: Intervalo[] = marcadas
    .filter((v) => v.id !== ignorarVisitaId)
    .map((v) => ({
      inicio: v.inicioEm,
      fim: new Date(v.inicioEm.getTime() + v.duracaoMin * 60000),
    }));

  const doSistema = [...ocupados];
  const doGoogle = await ocupadosDoVendedor(alvo, inicioDoDia, fimDoDia);
  if (doGoogle.estado === "ok") ocupados.push(...doGoogle.ocupados);

  const livres = horariosLivres(data, ocupados, duracaoMin, undefined, new Date());
  const formatar = (l: Intervalo[]) => l.map(textoDoIntervalo);

  // Ocupado dentro do expediente é o que interessa mostrar: a reunião das 22h
  // não explica nada sobre o dia de trabalho.
  const noExpediente = (l: Intervalo[]) =>
    juntarIntervalos(l).filter(
      (o) =>
        o.fim.getTime() > janela.inicio.getTime() &&
        o.inicio.getTime() < janela.fim.getTime()
    );

  // A regra de privacidade: só o dono da agenda vê os próprios compromissos.
  const ehDono = usuario.vendedorId === alvo;
  const visiveis = noExpediente(ehDono ? ocupados : doSistema);
  const particularOculto =
    !ehDono &&
    doGoogle.estado === "ok" &&
    noExpediente(doGoogle.ocupados).length > 0;

  if (doGoogle.estado === "erro") {
    return {
      estado: "erro",
      livres: formatar(livres),
      ocupados: formatar(visiveis),
      temParticularOculto: false,
      mensagem: doGoogle.mensagem,
    };
  }
  return {
    estado: doGoogle.estado === "ok" ? "ok" : "sem_conexao",
    livres: formatar(livres),
    ocupados: formatar(visiveis),
    temParticularOculto: particularOculto,
  };
}
