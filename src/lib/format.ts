const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimalPtBR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata centavos (integer) como moeda BRL. */
export function formatarCentavos(centavos: number): string {
  return brl.format(centavos / 100);
}

/** Centavos → string editável para input ("8.500,00"), sem símbolo de moeda. */
export function centavosParaInput(centavos: number | null): string {
  if (centavos === null) return "";
  return decimalPtBR.format(centavos / 100);
}

/** Converte entrada do usuário ("1.234,56") em centavos. Retorna null se inválida. */
export function parseParaCentavos(valor: string): number | null {
  const limpo = valor.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(limpo);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

/** Item de orçamento: valor único ou faixa "R$ X – R$ Y". */
export function formatarValorItem(
  valorMin: number | null,
  valorMax: number | null
): string {
  if (valorMin === null) return "";
  if (valorMax === null) return formatarCentavos(valorMin);
  return `${formatarCentavos(valorMin)} – ${formatarCentavos(valorMax)}`;
}
