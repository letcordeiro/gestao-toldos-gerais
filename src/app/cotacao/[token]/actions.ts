"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  cotacaoFornecedores,
  cotacaoItens,
  cotacaoRespostas,
  cotacoes,
} from "@/db/schema";
import { parseParaCentavos } from "@/lib/format";

export type RespostaCotacaoState = { ok?: boolean; erro?: string };

/**
 * Página pública do fornecedor: sem sessão, a trava é o token. Cada
 * fornecedor tem o próprio link e não vê o preço dos outros.
 */
export async function responderCotacao(
  _prev: RespostaCotacaoState,
  formData: FormData
): Promise<RespostaCotacaoState> {
  const token = z.string().trim().min(1).safeParse(formData.get("token"));
  if (!token.success) return { erro: "Link inválido." };

  const convite = await db.query.cotacaoFornecedores.findFirst({
    where: eq(cotacaoFornecedores.token, token.data),
  });
  if (!convite) return { erro: "Cotação não encontrada." };

  const cotacao = await db.query.cotacoes.findFirst({
    where: eq(cotacoes.id, convite.cotacaoId),
  });
  if (!cotacao) return { erro: "Cotação não encontrada." };
  if (cotacao.situacao !== "aberta") {
    return { erro: "Esta cotação já foi encerrada." };
  }

  const itens = await db
    .select({ id: cotacaoItens.id })
    .from(cotacaoItens)
    .where(eq(cotacaoItens.cotacaoId, cotacao.id));

  // Regrava tudo: responder de novo corrige um preço digitado errado.
  await db
    .delete(cotacaoRespostas)
    .where(eq(cotacaoRespostas.cotacaoFornecedorId, convite.id));

  const linhas = itens.map((item) => {
    const bruto = String(formData.get(`item-${item.id}`) ?? "").trim();
    const centavos = bruto ? parseParaCentavos(bruto) : null;
    return {
      cotacaoFornecedorId: convite.id,
      itemId: item.id,
      // Valor não preenchido (ou inválido) significa "não cotei este item" —
      // é diferente de cotar por zero.
      valorUnitario: centavos != null && centavos > 0 ? centavos : null,
    };
  });
  if (linhas.length > 0) await db.insert(cotacaoRespostas).values(linhas);

  const algumCotado = linhas.some((l) => l.valorUnitario != null);
  if (!algumCotado) {
    return { erro: "Preencha o preço de pelo menos um item." };
  }

  await db
    .update(cotacaoFornecedores)
    .set({
      respondidoEm: new Date(),
      prazoEntrega: String(formData.get("prazoEntrega") ?? "").trim() || null,
      observacao: String(formData.get("observacao") ?? "").trim() || null,
    })
    .where(eq(cotacaoFornecedores.id, convite.id));

  revalidatePath(`/cotacoes/${cotacao.id}`);
  return { ok: true };
}
