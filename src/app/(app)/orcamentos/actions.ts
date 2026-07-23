"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, like, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import {
  atendimentos,
  fases,
  historicoFases,
  orcamentoFotos,
  orcamentoItens,
  orcamentos,
} from "@/db/schema";
import { exigirSessao, usuarioAtual } from "@/lib/auth";
import { parseParaCentavos } from "@/lib/format";
import { removerFotoArquivo, salvarFoto } from "@/lib/uploads";

const itemSchema = z.object({
  descricao: z.string().trim().min(1),
  valorMin: z.string().optional(),
  valorMax: z.string().optional(),
  subtitulo: z.boolean().optional(),
});

const orcamentoSchema = z.object({
  atendimentoId: z.coerce.number().int().positive("Escolha o atendimento"),
  modeloId: z.coerce.number().int().positive().optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
  tipoEstrutura: z.enum(["aluminio", "metalica"]),
  formato: z.enum(["capotinha", "braco_retratil"]).optional(),
  descricaoMaterial: z.string().trim().optional(),
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
  const linhas = await db
    .select({ numero: orcamentos.numero })
    .from(orcamentos)
    .where(like(orcamentos.numero, `${ano}-%`));
  // Maior sequência numérica do ano (ignora sufixos não numéricos)
  const maxSeq = linhas.reduce((max, { numero }) => {
    const n = parseInt(numero.split("-")[1] ?? "", 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return `${ano}-${String(maxSeq + 1).padStart(3, "0")}`;
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

/**
 * Aprovar o orçamento leva o atendimento para "Orçamento aprovado".
 * Não mexe se o atendimento JÁ está numa fase de negócio fechado — senão
 * marcar aprovado puxaria um cliente de "Em produção" de volta.
 */
async function moverParaOrcamentoAprovado(atendimentoId: number) {
  const faseAprovado = await db.query.fases.findFirst({
    where: eq(fases.nome, "Orçamento aprovado"),
  });
  if (!faseAprovado) return;

  const atendimento = await db.query.atendimentos.findFirst({
    where: eq(atendimentos.id, atendimentoId),
  });
  if (!atendimento || atendimento.faseId === faseAprovado.id) return;

  const faseAtual = await db.query.fases.findFirst({
    where: eq(fases.id, atendimento.faseId),
  });
  if (faseAtual?.liberaInstalacao) return; // já está adiante no funil

  await db
    .update(atendimentos)
    .set({ faseId: faseAprovado.id, atualizadoEm: new Date() })
    .where(eq(atendimentos.id, atendimentoId));
  await db.insert(historicoFases).values({
    atendimentoId,
    faseAnteriorId: atendimento.faseId,
    faseNovaId: faseAprovado.id,
  });
}

export async function criarOrcamento(
  _prev: OrcamentoFormState,
  formData: FormData
): Promise<OrcamentoFormState> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erro: "Sessão expirada" };

  let itensBrutos: unknown;
  try {
    itensBrutos = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { erro: "Itens inválidos" };
  }

  const parsed = orcamentoSchema.safeParse({
    atendimentoId: formData.get("atendimentoId"),
    modeloId: formData.get("modeloId") || undefined,
    vendedorId: formData.get("vendedorId") || undefined,
    tipoEstrutura: formData.get("tipoEstrutura"),
    formato: formData.get("formato") || undefined,
    descricaoMaterial: formData.get("descricaoMaterial") || undefined,
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

  // Vendedor responsável = o usuário logado (quem tem cadastro de vendedor).
  // Admin do env sem vendedor cai no que veio do formulário.
  const vendedorId = usuario.vendedorId ?? dados.vendedorId ?? null;

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
      vendedorId,
      descricaoMaterial: dados.descricaoMaterial || null,
      tipoEstrutura: dados.tipoEstrutura,
      formato: dados.formato ?? null,
      fixacaoVedacao: dados.fixacaoVedacao || null,
      garantiaTexto: dados.garantiaTexto || null,
      formaPagamento: dados.formaPagamento || null,
      prazoEntrega: dados.prazoEntrega || null,
      status: dados.status,
      publicToken: nanoid(12),
      enviadoEm: dados.status === "enviado" ? new Date() : null,
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

  // Fotos anexadas já na criação (opcional).
  const arquivos = formData
    .getAll("fotosNovas")
    .filter((f): f is File => f instanceof File && f.size > 0);
  let ordemFoto = 0;
  for (const file of arquivos) {
    const salvo = await salvarFoto(novo.id, file);
    if (salvo.ok) {
      await db.insert(orcamentoFotos).values({
        orcamentoId: novo.id,
        arquivo: salvo.arquivo,
        ordem: ordemFoto++,
      });
    }
  }

  // Quem tem cadastro de vendedor e orça um lead do pool vira dono do atendimento.
  if (usuario.vendedorId != null) {
    const at = await db.query.atendimentos.findFirst({
      where: eq(atendimentos.id, dados.atendimentoId),
    });
    if (at && at.vendedorId == null) {
      await db
        .update(atendimentos)
        .set({ vendedorId: usuario.vendedorId })
        .where(eq(atendimentos.id, dados.atendimentoId));
    }
  }

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
    vendedorId: formData.get("vendedorId") || undefined,
    tipoEstrutura: formData.get("tipoEstrutura"),
    formato: formData.get("formato") || undefined,
    descricaoMaterial: formData.get("descricaoMaterial") || undefined,
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

  // Marca o envio na primeira vez que vira "enviado" (não reinicia o prazo).
  const viraEnviadoAgora =
    dados.status === "enviado" && existente.status !== "enviado";

  await db
    .update(orcamentos)
    .set({
      atendimentoId: dados.atendimentoId,
      modeloId: dados.modeloId ?? null,
      vendedorId: dados.vendedorId ?? null,
      descricaoMaterial: dados.descricaoMaterial || null,
      tipoEstrutura: dados.tipoEstrutura,
      formato: dados.formato ?? null,
      fixacaoVedacao: dados.fixacaoVedacao || null,
      garantiaTexto: dados.garantiaTexto || null,
      formaPagamento: dados.formaPagamento || null,
      prazoEntrega: dados.prazoEntrega || null,
      status: dados.status,
      ...(viraEnviadoAgora ? { enviadoEm: new Date() } : {}),
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

  const marcarEnvio = novoStatus === "enviado" && orcamento.status !== "enviado";

  await db
    .update(orcamentos)
    .set({
      status: novoStatus,
      ...(marcarEnvio ? { enviadoEm: new Date() } : {}),
    })
    .where(eq(orcamentos.id, id));

  if (novoStatus === "enviado") {
    await moverParaOrcamentoEnviado(orcamento.atendimentoId);
  }
  if (novoStatus === "aprovado") {
    await moverParaOrcamentoAprovado(orcamento.atendimentoId);
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  revalidatePath("/atendimentos");
  revalidatePath(`/atendimentos/${orcamento.atendimentoId}`);
}

// Verifica se o usuário pode mexer no orçamento (gestor = qualquer; vendedor = o seu).
async function orcamentoEditavel(orcamentoId: number) {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  const orc = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
  });
  if (!orc) return null;
  if (usuario.papel === "vendedor" && orc.vendedorId !== usuario.vendedorId)
    return null;
  return orc;
}

export type FotoState = { erro?: string; ok?: boolean };

export async function adicionarFotoOrcamento(
  _prev: FotoState,
  formData: FormData
): Promise<FotoState> {
  const orcamentoId = Number(formData.get("orcamentoId"));
  if (!Number.isInteger(orcamentoId) || orcamentoId <= 0)
    return { erro: "Orçamento inválido" };

  const orc = await orcamentoEditavel(orcamentoId);
  if (!orc) return { erro: "Sem permissão para este orçamento" };

  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0)
    return { erro: "Escolha uma imagem" };

  const salvo = await salvarFoto(orcamentoId, file);
  if (!salvo.ok) return { erro: salvo.erro };

  const [{ maxOrdem }] = await db
    .select({ maxOrdem: sql<number>`coalesce(max(${orcamentoFotos.ordem}), -1)` })
    .from(orcamentoFotos)
    .where(eq(orcamentoFotos.orcamentoId, orcamentoId));

  await db.insert(orcamentoFotos).values({
    orcamentoId,
    arquivo: salvo.arquivo,
    ordem: (maxOrdem ?? -1) + 1,
  });

  revalidatePath(`/orcamentos/${orcamentoId}`);
  return { ok: true };
}

export async function removerFotoOrcamento(fotoId: number) {
  const id = z.coerce.number().int().positive().parse(fotoId);
  const foto = await db.query.orcamentoFotos.findFirst({
    where: eq(orcamentoFotos.id, id),
  });
  if (!foto) return;
  const orc = await orcamentoEditavel(foto.orcamentoId);
  if (!orc) return;

  await db.delete(orcamentoFotos).where(eq(orcamentoFotos.id, id));
  await removerFotoArquivo(foto.orcamentoId, foto.arquivo);
  revalidatePath(`/orcamentos/${foto.orcamentoId}`);
}

// Exclui um orçamento — permitido apenas quando está em rascunho.
export async function excluirOrcamento(
  orcamentoId: number
): Promise<{ erro?: string }> {
  const id = z.coerce.number().int().positive().parse(orcamentoId);
  const orc = await orcamentoEditavel(id);
  if (!orc) return { erro: "Sem permissão para este orçamento" };
  if (orc.status !== "rascunho")
    return { erro: "Só é possível excluir orçamentos em rascunho" };

  // Remove as fotos (arquivos no disco + registros), depois itens e o orçamento.
  const fotos = await db
    .select()
    .from(orcamentoFotos)
    .where(eq(orcamentoFotos.orcamentoId, id));
  for (const foto of fotos) {
    await removerFotoArquivo(id, foto.arquivo);
  }
  await db.delete(orcamentoFotos).where(eq(orcamentoFotos.orcamentoId, id));
  await db.delete(orcamentoItens).where(eq(orcamentoItens.orcamentoId, id));
  await db.delete(orcamentos).where(eq(orcamentos.id, id));

  revalidatePath("/orcamentos");
  revalidatePath(`/atendimentos/${orc.atendimentoId}`);
  redirect("/orcamentos");
}

// Cria um novo orçamento (rascunho) copiando todos os dados de um existente.
export async function duplicarOrcamento(formData: FormData) {
  await exigirSessao();
  const id = z.coerce.number().int().positive().parse(formData.get("orcamentoId"));

  const original = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, id),
  });
  if (!original) return;

  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, id));

  const numero = await proximoNumero();
  const [novo] = await db
    .insert(orcamentos)
    .values({
      numero,
      atendimentoId: original.atendimentoId,
      modeloId: original.modeloId,
      vendedorId: original.vendedorId,
      descricaoMaterial: original.descricaoMaterial,
      tipoEstrutura: original.tipoEstrutura,
      formato: original.formato,
      fixacaoVedacao: original.fixacaoVedacao,
      garantiaTexto: original.garantiaTexto,
      formaPagamento: original.formaPagamento,
      prazoEntrega: original.prazoEntrega,
      status: "rascunho",
      publicToken: nanoid(12),
    })
    .returning({ id: orcamentos.id });

  if (itens.length > 0) {
    await db.insert(orcamentoItens).values(
      itens.map((item) => ({
        orcamentoId: novo.id,
        descricao: item.descricao,
        valorMin: item.valorMin,
        valorMax: item.valorMax,
        ordem: item.ordem,
      }))
    );
  }

  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${novo.id}/editar`);
}
