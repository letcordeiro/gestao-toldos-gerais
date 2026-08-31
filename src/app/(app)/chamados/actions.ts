"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  atendimentos,
  chamadoInteracoes,
  chamados,
  clientes,
  orcamentos,
} from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import { parseParaCentavos } from "@/lib/format";

const SITUACOES = ["aberto", "em_andamento", "resolvido", "cancelado"] as const;

const chamadoSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  atendimentoId: z.coerce
    .number()
    .int()
    .positive("Escolha o cliente"),
  orcamentoId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v)),
  assunto: z.string().trim().min(1, "Escreva o assunto do chamado").max(120),
  descricao: z
    .string()
    .trim()
    .max(4000)
    .transform((v) => v || null),
  tipo: z.enum(["receptivo", "ativo"]),
  prioridade: z.enum(["baixa", "media", "alta"]),
  // "" = ainda não decidido
  naGarantia: z
    .union([z.literal(""), z.literal("sim"), z.literal("nao")])
    .transform((v) => (v === "" ? null : v === "sim")),
  responsavelId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v)),

  // --- Ordem de Manutenção ---
  instalador: z
    .string()
    .trim()
    .max(120)
    .transform((v) => v || null),
  // Chega mascarado do formulário ("1.250,00"); vira centavos aqui.
  valor: z
    .string()
    .trim()
    .transform((v) => (v ? parseParaCentavos(v) : null))
    .refine((v) => v === null || v >= 0, "Valor inválido"),
  tipoServico: z
    .union([z.literal(""), z.enum(["vedacao", "outros"])])
    .transform((v) => (v === "" ? null : v)),
  servicoOutros: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null),
  // <input type="date"> devolve "2026-09-03". Monta a data no fuso local:
  // new Date("2026-09-03") seria UTC e imprimiria o dia anterior na ficha.
  visitaEm: z
    .string()
    .trim()
    .transform((v) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
      const [a, m, d] = v.split("-").map(Number);
      return new Date(a, m - 1, d);
    }),
});

export type ChamadoFormState = { ok?: boolean; erro?: string; criadoId?: number };

export async function salvarChamado(
  _prev: ChamadoFormState,
  formData: FormData
): Promise<ChamadoFormState> {
  const usuario = await exigirUsuario();

  const parsed = chamadoSchema.safeParse({
    id: formData.get("id") || undefined,
    atendimentoId: formData.get("atendimentoId"),
    orcamentoId: formData.get("orcamentoId") ?? "",
    assunto: formData.get("assunto"),
    descricao: formData.get("descricao") ?? "",
    tipo: formData.get("tipo") ?? "receptivo",
    prioridade: formData.get("prioridade") ?? "media",
    naGarantia: formData.get("naGarantia") ?? "",
    responsavelId: formData.get("responsavelId") ?? "",
    instalador: formData.get("instalador") ?? "",
    valor: formData.get("valor") ?? "",
    tipoServico: formData.get("tipoServico") ?? "",
    servicoOutros: formData.get("servicoOutros") ?? "",
    visitaEm: formData.get("visitaEm") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.id) {
    await db
      .update(chamados)
      .set({
        assunto: d.assunto,
        descricao: d.descricao,
        tipo: d.tipo,
        prioridade: d.prioridade,
        naGarantia: d.naGarantia,
        responsavelId: d.responsavelId,
        orcamentoId: d.orcamentoId,
        instalador: d.instalador,
        valor: d.valor,
        tipoServico: d.tipoServico,
        servicoOutros: d.servicoOutros,
        visitaEm: d.visitaEm,
      })
      .where(eq(chamados.id, d.id));
    revalidar(d.id, d.atendimentoId);
    return { ok: true, criadoId: d.id };
  }

  const [novo] = await db
    .insert(chamados)
    .values({
      atendimentoId: d.atendimentoId,
      orcamentoId: d.orcamentoId,
      assunto: d.assunto,
      descricao: d.descricao,
      tipo: d.tipo,
      prioridade: d.prioridade,
      naGarantia: d.naGarantia,
      responsavelId: d.responsavelId ?? usuario.vendedorId ?? null,
      instalador: d.instalador,
      valor: d.valor,
      tipoServico: d.tipoServico,
      servicoOutros: d.servicoOutros,
      visitaEm: d.visitaEm,
      criadoPor: usuario.nome ?? usuario.email,
    })
    .returning({ id: chamados.id });

  revalidar(novo.id, d.atendimentoId);
  return { ok: true, criadoId: novo.id };
}

export async function mudarSituacaoChamado(
  chamadoId: number,
  situacao: string
): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario();
  const id = z.coerce.number().int().positive().parse(chamadoId);
  const nova = z.enum(SITUACOES).parse(situacao);

  const chamado = await db.query.chamados.findFirst({
    where: eq(chamados.id, id),
  });
  if (!chamado) return { erro: "Chamado não encontrado" };
  if (chamado.situacao === nova) return {};

  const fechado = nova === "resolvido" || nova === "cancelado";
  await db
    .update(chamados)
    .set({ situacao: nova, fechadoEm: fechado ? new Date() : null })
    .where(eq(chamados.id, id));

  // A mudança de situação vira linha do histórico: quem abrir o chamado
  // depois entende o que aconteceu sem precisar perguntar.
  await db.insert(chamadoInteracoes).values({
    chamadoId: id,
    texto: `Situação alterada para "${SITUACAO_LABEL[nova]}".`,
    autor: usuario.nome ?? usuario.email,
  });

  revalidar(id, chamado.atendimentoId);
  return {};
}

export async function adicionarInteracao(
  chamadoId: number,
  texto: string
): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario();
  const id = z.coerce.number().int().positive().parse(chamadoId);
  const conteudo = z
    .string()
    .trim()
    .min(1, "Escreva o retorno")
    .max(4000)
    .safeParse(texto);
  if (!conteudo.success) return { erro: conteudo.error.issues[0].message };

  const chamado = await db.query.chamados.findFirst({
    where: eq(chamados.id, id),
  });
  if (!chamado) return { erro: "Chamado não encontrado" };

  await db.insert(chamadoInteracoes).values({
    chamadoId: id,
    texto: conteudo.data,
    autor: usuario.nome ?? usuario.email,
  });
  revalidar(id, chamado.atendimentoId);
  return {};
}

const SITUACAO_LABEL: Record<(typeof SITUACOES)[number], string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
};

function revalidar(chamadoId: number, atendimentoId: number) {
  revalidatePath("/chamados");
  revalidatePath(`/chamados/${chamadoId}`);
  revalidatePath(`/atendimentos/${atendimentoId}`);
  revalidatePath("/painel");
}

/**
 * Clientes que podem receber uma ordem de manutenção.
 *
 * Ao contrário da visita, aqui NÃO se filtra fase terminal: o chamado é
 * pós-venda, então o atendimento normalmente já está fechado — filtrar por
 * fase aberta esconderia justamente quem já tem toldo instalado.
 */
export async function atendimentosParaChamado() {
  const usuario = await exigirUsuario();
  const filtros: (SQL | undefined)[] = [eq(clientes.ativo, true)];
  if (!veFunilInteiro(usuario.papel) && usuario.vendedorId != null) {
    filtros.push(eq(atendimentos.vendedorId, usuario.vendedorId));
  }

  return db
    .select({
      id: atendimentos.id,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
    })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(and(...filtros))
    .orderBy(asc(clientes.nome));
}

/**
 * Orçamentos de um atendimento, para ligar o chamado ao serviço que o gerou.
 *
 * Existe porque o diálogo aberto pela lista só descobre o cliente depois que
 * alguém escolhe — e sem essa ligação o chamado nasce sem data de instalação,
 * que é o que decide a garantia.
 */
export async function orcamentosDoAtendimento(atendimentoId: number) {
  await exigirUsuario();
  const id = z.coerce.number().int().positive().parse(atendimentoId);
  return db
    .select({ id: orcamentos.id, numero: orcamentos.numero })
    .from(orcamentos)
    .where(eq(orcamentos.atendimentoId, id))
    .orderBy(desc(orcamentos.criadoEm));
}
