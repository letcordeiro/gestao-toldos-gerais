// Comparação de cotações: quem cotou o quê e quem saiu mais barato.
// Puro — é conta de dinheiro, e escolher o fornecedor errado por erro de
// soma custa margem.

export type ItemCotacao = {
  id: number;
  descricao: string;
  quantidade: string | null;
  unidade: string | null;
};

export type RespostaFornecedor = {
  /** id do convite (cotacao_fornecedores), não do fornecedor. */
  conviteId: number;
  fornecedorNome: string;
  respondidoEm: Date | null;
  prazoEntrega: string | null;
  observacao: string | null;
  /** itemId → valor unitário em centavos (null = não cotou). */
  valores: Map<number, number | null>;
};

export type CelulaComparacao = {
  valor: number | null;
  /** Menor preço entre quem cotou este item. */
  melhor: boolean;
};

export type ColunaComparacao = {
  conviteId: number;
  fornecedorNome: string;
  respondeu: boolean;
  prazoEntrega: string | null;
  observacao: string | null;
  celulas: CelulaComparacao[];
  /** Soma do que ele cotou. Null quando não cotou nada. */
  total: number | null;
  /** Só quem cotou TODOS os itens tem total comparável. */
  totalCompleto: boolean;
};

/**
 * Monta a tabela de comparação: uma coluna por fornecedor, uma linha por item.
 *
 * `totalCompleto` existe porque somar cotação parcial engana: um fornecedor
 * que cotou 2 de 5 itens sempre parece o mais barato.
 */
export function compararCotacoes(
  itens: ItemCotacao[],
  respostas: RespostaFornecedor[]
): ColunaComparacao[] {
  // Menor preço de cada item, considerando só quem cotou.
  const melhorPorItem = new Map<number, number>();
  for (const item of itens) {
    const valores = respostas
      .map((r) => r.valores.get(item.id))
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (valores.length > 0) {
      melhorPorItem.set(item.id, Math.min(...valores));
    }
  }

  return respostas.map((r) => {
    const celulas = itens.map((item) => {
      const valor = r.valores.get(item.id) ?? null;
      return {
        valor,
        melhor:
          valor != null && valor > 0 && melhorPorItem.get(item.id) === valor,
      };
    });
    const cotados = celulas.filter((c) => c.valor != null && c.valor > 0);
    return {
      conviteId: r.conviteId,
      fornecedorNome: r.fornecedorNome,
      respondeu: r.respondidoEm != null,
      prazoEntrega: r.prazoEntrega,
      observacao: r.observacao,
      celulas,
      total:
        cotados.length > 0
          ? cotados.reduce((s, c) => s + (c.valor as number), 0)
          : null,
      totalCompleto: cotados.length === itens.length && itens.length > 0,
    };
  });
}

/**
 * Quem venceu no total. Só entra na disputa quem cotou a lista inteira —
 * senão o "mais barato" seria só o que cotou menos coisa.
 */
export function melhorTotal(colunas: ColunaComparacao[]): number | null {
  const completos = colunas.filter((c) => c.totalCompleto && c.total != null);
  if (completos.length === 0) return null;
  return Math.min(...completos.map((c) => c.total as number));
}

export type SituacaoCotacao = "aberta" | "fechada" | "cancelada";

export const SITUACAO_COTACAO_LABEL: Record<SituacaoCotacao, string> = {
  aberta: "Aberta",
  fechada: "Fechada",
  cancelada: "Cancelada",
};
