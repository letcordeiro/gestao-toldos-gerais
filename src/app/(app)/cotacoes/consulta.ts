import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  cotacaoFornecedores,
  cotacaoItens,
  cotacaoRespostas,
  fornecedores,
  orcamentos,
} from "@/db/schema";
import type { RespostaFornecedor } from "@/lib/cotacoes";

/** Fornecedores ativos, para escolher quem cota. */
export async function fornecedoresAtivos() {
  return db
    .select({
      id: fornecedores.id,
      nome: fornecedores.nome,
      fornece: fornecedores.fornece,
    })
    .from(fornecedores)
    .where(eq(fornecedores.ativo, true))
    .orderBy(asc(fornecedores.nome));
}

/** Orçamentos para amarrar a cotação ao serviço que a motivou. */
export async function orcamentosParaCotacao() {
  return db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      clienteNome: clientes.nome,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .orderBy(asc(orcamentos.numero));
}

export async function itensDaCotacao(cotacaoId: number) {
  return db
    .select()
    .from(cotacaoItens)
    .where(eq(cotacaoItens.cotacaoId, cotacaoId))
    .orderBy(asc(cotacaoItens.ordem));
}

/** Convites + respostas, no formato que `compararCotacoes` espera. */
export async function respostasDaCotacao(
  cotacaoId: number
): Promise<(RespostaFornecedor & { token: string; telefone: string | null })[]> {
  const convites = await db
    .select({
      id: cotacaoFornecedores.id,
      token: cotacaoFornecedores.token,
      prazoEntrega: cotacaoFornecedores.prazoEntrega,
      observacao: cotacaoFornecedores.observacao,
      respondidoEm: cotacaoFornecedores.respondidoEm,
      fornecedorNome: fornecedores.nome,
      telefone: fornecedores.telefone,
    })
    .from(cotacaoFornecedores)
    .innerJoin(
      fornecedores,
      eq(cotacaoFornecedores.fornecedorId, fornecedores.id)
    )
    .where(eq(cotacaoFornecedores.cotacaoId, cotacaoId))
    .orderBy(asc(fornecedores.nome));

  const todas = await db
    .select()
    .from(cotacaoRespostas)
    .innerJoin(
      cotacaoFornecedores,
      eq(cotacaoRespostas.cotacaoFornecedorId, cotacaoFornecedores.id)
    )
    .where(eq(cotacaoFornecedores.cotacaoId, cotacaoId));

  return convites.map((c) => {
    const valores = new Map<number, number | null>();
    for (const r of todas) {
      if (r.cotacao_respostas.cotacaoFornecedorId === c.id) {
        valores.set(r.cotacao_respostas.itemId, r.cotacao_respostas.valorUnitario);
      }
    }
    return {
      conviteId: c.id,
      fornecedorNome: c.fornecedorNome,
      respondidoEm: c.respondidoEm,
      prazoEntrega: c.prazoEntrega,
      observacao: c.observacao,
      valores,
      token: c.token,
      telefone: c.telefone,
    };
  });
}
