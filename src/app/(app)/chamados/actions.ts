"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chamadoInteracoes, chamados } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";

const SITUACOES = ["aberto", "em_andamento", "resolvido", "cancelado"] as const;

const chamadoSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  atendimentoId: z.coerce.number().int().positive(),
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
