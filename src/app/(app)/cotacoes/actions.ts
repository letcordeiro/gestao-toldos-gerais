"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import {
  cotacaoFornecedores,
  cotacaoItens,
  cotacaoRespostas,
  cotacoes,
} from "@/db/schema";
import { exigirComercial, exigirUsuario } from "@/lib/auth";
import { parseDataBR } from "@/lib/tarefas";

const itemSchema = z.object({
  descricao: z.string().trim().min(1).max(200),
  quantidade: z.string().trim().max(30).optional(),
  unidade: z.string().trim().max(20).optional(),
});

const cotacaoSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  titulo: z.string().trim().min(1, "Dê um título à cotação").max(120),
  orcamentoId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v)),
  prazoResposta: z
    .string()
    .trim()
    .transform((v) => (v ? parseDataBR(v) : null)),
  observacoes: z.string().trim().max(2000).transform((v) => v || null),
  observacoesInternas: z.string().trim().max(2000).transform((v) => v || null),
  itens: z.array(itemSchema).min(1, "Inclua pelo menos um item"),
  fornecedorIds: z
    .array(z.coerce.number().int().positive())
    .min(1, "Escolha pelo menos um fornecedor"),
});

export type CotacaoFormState = { ok?: boolean; erro?: string; criadoId?: number };

export async function salvarCotacao(
  _prev: CotacaoFormState,
  formData: FormData
): Promise<CotacaoFormState> {
  const usuario = await exigirUsuario();
  await exigirComercial();

  let itens: unknown = [];
  try {
    itens = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { erro: "Lista de itens inválida" };
  }

  const parsed = cotacaoSchema.safeParse({
    id: formData.get("id") || undefined,
    titulo: formData.get("titulo"),
    orcamentoId: formData.get("orcamentoId") ?? "",
    prazoResposta: formData.get("prazoResposta") ?? "",
    observacoes: formData.get("observacoes") ?? "",
    observacoesInternas: formData.get("observacoesInternas") ?? "",
    itens,
    fornecedorIds: formData.getAll("fornecedorIds").map(Number),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  const dados = {
    titulo: d.titulo,
    orcamentoId: d.orcamentoId,
    prazoResposta: d.prazoResposta,
    observacoes: d.observacoes,
    observacoesInternas: d.observacoesInternas,
  };

  const cotacaoId = d.id
    ? (await db.update(cotacoes).set(dados).where(eq(cotacoes.id, d.id)), d.id)
    : (
        await db
          .insert(cotacoes)
          .values({ ...dados, criadoPor: usuario.nome ?? usuario.email })
          .returning({ id: cotacoes.id })
      )[0].id;

  // Itens são regravados do zero. Isso apaga as respostas junto (cascade), e
  // é o certo: mudou a lista de material, o preço de antes não vale mais.
  if (d.id) {
    await db.delete(cotacaoItens).where(eq(cotacaoItens.cotacaoId, cotacaoId));
  }
  await db.insert(cotacaoItens).values(
    d.itens.map((item, i) => ({
      cotacaoId,
      descricao: item.descricao,
      quantidade: item.quantidade || null,
      unidade: item.unidade || null,
      ordem: i,
    }))
  );

  // Convites: mantém os que já existem (para não invalidar link já enviado) e
  // remove só quem saiu da lista.
  const atuais = await db
    .select()
    .from(cotacaoFornecedores)
    .where(eq(cotacaoFornecedores.cotacaoId, cotacaoId));
  const manter = new Set(d.fornecedorIds);

  const removidos = atuais.filter((c) => !manter.has(c.fornecedorId));
  if (removidos.length > 0) {
    await db.delete(cotacaoFornecedores).where(
      inArray(
        cotacaoFornecedores.id,
        removidos.map((r) => r.id)
      )
    );
  }
  const jaConvidados = new Set(atuais.map((c) => c.fornecedorId));
  const novos = d.fornecedorIds.filter((id) => !jaConvidados.has(id));
  if (novos.length > 0) {
    await db.insert(cotacaoFornecedores).values(
      novos.map((fornecedorId) => ({
        cotacaoId,
        fornecedorId,
        token: nanoid(12),
      }))
    );
  }

  revalidatePath("/cotacoes");
  revalidatePath(`/cotacoes/${cotacaoId}`);
  return { ok: true, criadoId: cotacaoId };
}

export async function mudarSituacaoCotacao(
  cotacaoId: number,
  situacao: string
): Promise<{ erro?: string }> {
  await exigirComercial();
  const id = z.coerce.number().int().positive().parse(cotacaoId);
  const nova = z.enum(["aberta", "fechada", "cancelada"]).parse(situacao);
  await db.update(cotacoes).set({ situacao: nova }).where(eq(cotacoes.id, id));
  revalidatePath("/cotacoes");
  revalidatePath(`/cotacoes/${id}`);
  return {};
}

export async function excluirCotacao(cotacaoId: number) {
  await exigirComercial();
  const id = z.coerce.number().int().positive().parse(cotacaoId);
  // Itens, convites e respostas saem em cascata.
  await db.delete(cotacoes).where(eq(cotacoes.id, id));
  revalidatePath("/cotacoes");
}

/** Zera a resposta de um fornecedor — usado quando ele pede para refazer. */
export async function limparResposta(conviteId: number) {
  await exigirComercial();
  const id = z.coerce.number().int().positive().parse(conviteId);
  await db
    .delete(cotacaoRespostas)
    .where(eq(cotacaoRespostas.cotacaoFornecedorId, id));
  await db
    .update(cotacaoFornecedores)
    .set({ respondidoEm: null, prazoEntrega: null, observacao: null })
    .where(eq(cotacaoFornecedores.id, id));

  const convite = await db.query.cotacaoFornecedores.findFirst({
    where: eq(cotacaoFornecedores.id, id),
  });
  if (convite) revalidatePath(`/cotacoes/${convite.cotacaoId}`);
}
