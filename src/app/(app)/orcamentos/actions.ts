"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc, eq, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  atendimentos,
  fases,
  historicoFases,
  orcamentoItens,
  orcamentos,
} from "@/db/schema";
import { exigirSessao } from "@/lib/auth";
import { parseParaCentavos } from "@/lib/format";

const itemSchema = z.object({
  descricao: z.string().trim().min(1),
  valorMin: z.string().optional(),
  valorMax: z.string().optional(),
  subtitulo: z.boolean().optional(),
});

const orcamentoSchema = z.object({
  atendimentoId: z.coerce.number().int().positive("Escolha o atendimento"),
  modeloId: z.coerce.number().int().positive().optional(),
  tipoEstrutura: z.enum(["aluminio", "ferro"]),
  descricaoMaterial: z.string().trim().optional(),
  estruturaTexto: z.string().trim().optional(),
  fixacaoVedacao: z.string().trim().optional(),
  garantiaTexto: z.string().trim().optional(),
  formaPagamento: z.string().trim().optional(),
  prazoEntrega: z.string().trim().optional(),
  status: z.enum(["rascunho", "enviado"]),
  itens: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});

export type OrcamentoFormState = { erro?: string };

type ItemConvertido = {
  descricao: string;
  valorMin: number | null;
  valorMax: number | null;
};

// Converte itens do formulário para centavos (subtítulos ficam sem valor)
function converterItens(
  itens: z.infer<typeof itemSchema>[]
): { itens: ItemConvertido[] } | { erro: string } {
  const convertidos: ItemConvertido[] = [];
  for (const item of itens) {
    if (item.subtitulo) {
      convertidos.push({
        descricao: item.descricao,
        valorMin: null,
        valorMax: null,
      });
      continue;
    }
    const valorMin = item.valorMin ? parseParaCentavos(item.valorMin) : null;
    const valorMax = item.valorMax ? parseParaCentavos(item.valorMax) : null;
    if (valorMin === null) {
      return { erro: `Informe o valor do item "${item.descricao}"` };
    }
    convertidos.push({ descricao: item.descricao, valorMin, valorMax });
  }
  return { itens: convertidos };
}

async function proximoNumero(): Promise<string> {
  const ano = new Date().getFullYear();
  const [ultimo] = await db
    .select({ numero: orcamentos.numero })
    .from(orcamentos)
    .where(like(orcamentos.numero, `${ano}-%`))
    .orderBy(desc(orcamentos.numero))
    .limit(1);
  const seq = ultimo ? parseInt(ultimo.numero.split("-")[1], 10) + 1 : 1;
  return `${ano}-${String(seq).padStart(3, "0")}`;
}

async function moverParaOrcamentoEnviado(atendimentoId: number) {
  const faseEnviado = await db.query.fases.findFirst({
    where: eq(fases.nome, "Orçamento enviado"),
  });
  if (!faseEnviado) return;

  const atendimento = await db.query.atendimentos.findFirst({
    where: eq(atendimentos.id, atendimentoId),
  });
  if (!atendimento || atendimento.faseId === faseEnviado.id) return;

  await db
    .update(atendimentos)
    .set({ faseId: faseEnviado.id, atualizadoEm: new Date() })
    .where(eq(atendimentos.id, atendimentoId));
  await db.insert(historicoFases).values({
    atendimentoId,
    faseAnteriorId: atendimento.faseId,
    faseNovaId: faseEnviado.id,
  });
}

export async function criarOrcamento(
  _prev: OrcamentoFormState,
  formData: FormData
): Promise<OrcamentoFormState> {
  await exigirSessao();

  let itensBrutos: unknown;
  try {
    itensBrutos = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { erro: "Itens inválidos" };
  }

  const parsed = orcamentoSchema.safeParse({
    atendimentoId: formData.get("atendimentoId"),
    modeloId: formData.get("modeloId") || undefined,
    tipoEstrutura: formData.get("tipoEstrutura"),
    descricaoMaterial: formData.get("descricaoMaterial") || undefined,
    estruturaTexto: formData.get("estruturaTexto") || undefined,
    fixacaoVedacao: formData.get("fixacaoVedacao") || undefined,
    garantiaTexto: formData.get("garantiaTexto") || undefined,
    formaPagamento: formData.get("formaPagamento") || undefined,
    prazoEntrega: formData.get("prazoEntrega") || undefined,
    status: formData.get("status"),
    itens: itensBrutos,
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const conversao = converterItens(dados.itens);
  if ("erro" in conversao) return { erro: conversao.erro };
  const itensConvertidos = conversao.itens;

  const numero = await proximoNumero();

  const [novo] = await db
    .insert(orcamentos)
    .values({
      numero,
      atendimentoId: dados.atendimentoId,
      modeloId: dados.modeloId ?? null,
      descricaoMaterial: dados.descricaoMaterial || null,
      estruturaTexto: dados.estruturaTexto || null,
      tipoEstrutura: dados.tipoEstrutura,
      fixacaoVedacao: dados.fixacaoVedacao || null,
      garantiaTexto: dados.garantiaTexto || null,
      formaPagamento: dados.formaPagamento || null,
      prazoEntrega: dados.prazoEntrega || null,
      status: dados.status,
    })
    .returning({ id: orcamentos.id });

  await db.insert(orcamentoItens).values(
    itensConvertidos.map((item, i) => ({
      orcamentoId: novo.id,
      descricao: item.descricao,
      valorMin: item.valorMin,
      valorMax: item.valorMax,
      ordem: i,
    }))
  );

  if (dados.status === "enviado") {
    await moverParaOrcamentoEnviado(dados.atendimentoId);
  }

  revalidatePath("/orcamentos");
  revalidatePath("/atendimentos");
  redirect(`/orcamentos/${novo.id}`);
}

export async function atualizarOrcamento(
  _prev: OrcamentoFormState,
  formData: FormData
): Promise<OrcamentoFormState> {
  await exigirSessao();

  const orcamentoId = Number(formData.get("orcamentoId"));
  if (!Number.isInteger(orcamentoId) || orcamentoId <= 0) {
    return { erro: "Orçamento inválido" };
  }

  const existente = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
  });
  if (!existente) return { erro: "Orçamento não encontrado" };

  let itensBrutos: unknown;
  try {
    itensBrutos = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { erro: "Itens inválidos" };
  }

  const parsed = orcamentoSchema.safeParse({
    atendimentoId: formData.get("atendimentoId"),
    modeloId: formData.get("modeloId") || undefined,
    tipoEstrutura: formData.get("tipoEstrutura"),
    descricaoMaterial: formData.get("descricaoMaterial") || undefined,
    estruturaTexto: formData.get("estruturaTexto") || undefined,
    fixacaoVedacao: formData.get("fixacaoVedacao") || undefined,
    garantiaTexto: formData.get("garantiaTexto") || undefined,
    formaPagamento: formData.get("formaPagamento") || undefined,
    prazoEntrega: formData.get("prazoEntrega") || undefined,
    status: formData.get("status"),
    itens: itensBrutos,
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const conversao = converterItens(dados.itens);
  if ("erro" in conversao) return { erro: conversao.erro };

  await db
    .update(orcamentos)
    .set({
      atendimentoId: dados.atendimentoId,
      modeloId: dados.modeloId ?? null,
      descricaoMaterial: dados.descricaoMaterial || null,
      estruturaTexto: dados.estruturaTexto || null,
      tipoEstrutura: dados.tipoEstrutura,
      fixacaoVedacao: dados.fixacaoVedacao || null,
      garantiaTexto: dados.garantiaTexto || null,
      formaPagamento: dados.formaPagamento || null,
      prazoEntrega: dados.prazoEntrega || null,
      status: dados.status,
    })
    .where(eq(orcamentos.id, orcamentoId));

  // Regrava os itens (mais simples que fazer diff)
  await db
    .delete(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, orcamentoId));
  await db.insert(orcamentoItens).values(
    conversao.itens.map((item, i) => ({
      orcamentoId,
      descricao: item.descricao,
      valorMin: item.valorMin,
      valorMax: item.valorMax,
      ordem: i,
    }))
  );

  // Só move para "Orçamento enviado" se estava em rascunho antes
  if (dados.status === "enviado" && existente.status === "rascunho") {
    await moverParaOrcamentoEnviado(dados.atendimentoId);
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${orcamentoId}`);
  revalidatePath("/atendimentos");
  redirect(`/orcamentos/${orcamentoId}`);
}

const statusSchema = z.enum(["rascunho", "enviado", "aprovado", "recusado"]);

export async function mudarStatusOrcamento(
  orcamentoId: number,
  status: string
) {
  await exigirSessao();
  const novoStatus = statusSchema.parse(status);
  const id = z.coerce.number().int().positive().parse(orcamentoId);

  const orcamento = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, id),
  });
  if (!orcamento || orcamento.status === novoStatus) return;

  await db
    .update(orcamentos)
    .set({ status: novoStatus })
    .where(eq(orcamentos.id, id));

  if (novoStatus === "enviado") {
    await moverParaOrcamentoEnviado(orcamento.atendimentoId);
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  revalidatePath(`/atendimentos/${orcamento.atendimentoId}`);
}
