// Cálculo da comissão de instalação. Puro — é o que a empresa deve para
// quem foi na obra, então erro aqui vira briga.

export type LinhaComissao = {
  tipo: "percentual" | "fixo";
  percentual: number | null;
  valorFixo: number | null;
  pagoEm: Date | null;
};

/**
 * Quanto vale a comissão desta linha, em centavos.
 *
 * Percentual precisa do valor do orçamento. Enquanto o orçamento não tem
 * valor (ou é uma faixa sem mínimo), devolve `null` em vez de zero: "ainda
 * não dá para calcular" é diferente de "não deve nada".
 */
export function valorDaComissao(
  linha: LinhaComissao,
  valorOrcamento: number | null
): number | null {
  if (linha.tipo === "fixo") {
    return linha.valorFixo != null && linha.valorFixo > 0
      ? linha.valorFixo
      : null;
  }
  if (linha.percentual == null || linha.percentual <= 0) return null;
  if (valorOrcamento == null || valorOrcamento <= 0) return null;
  return Math.round((valorOrcamento * linha.percentual) / 100);
}

export type ResumoComissoes = {
  aPagar: number;
  pago: number;
  /** Linhas cujo valor ainda não dá para calcular. */
  semValor: number;
};

export function somarComissoes(
  linhas: (LinhaComissao & { valorOrcamento: number | null })[]
): ResumoComissoes {
  let aPagar = 0;
  let pago = 0;
  let semValor = 0;

  for (const l of linhas) {
    const valor = valorDaComissao(l, l.valorOrcamento);
    if (valor == null) {
      semValor++;
      continue;
    }
    if (l.pagoEm) pago += valor;
    else aPagar += valor;
  }
  return { aPagar, pago, semValor };
}

export const PAPEL_INSTALADOR_LABEL: Record<
  "responsavel" | "ajudante",
  string
> = {
  responsavel: "Responsável",
  ajudante: "Ajudante",
};
