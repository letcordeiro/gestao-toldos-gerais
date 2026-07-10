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

/**
 * Máscara de moeda para digitação: usa só os dígitos como centavos.
 * Ex.: "850000" → "8.500,00". Vazio permanece vazio.
 */
export function mascaraMoeda(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return "";
  return decimalPtBR.format(parseInt(digitos, 10) / 100);
}

/** Converte entrada do usuário ("1.234,56") em centavos. Retorna null se inválida. */
export function parseParaCentavos(valor: string): number | null {
  const limpo = valor.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(limpo);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

/** Máscara de telefone: (xx)xxxxx-xxxx (celular) ou (xx)xxxx-xxxx (fixo). */
export function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd})${resto}`;
  if (resto.length <= 8)
    return `(${ddd})${resto.slice(0, 4)}-${resto.slice(4)}`;
  return `(${ddd})${resto.slice(0, 5)}-${resto.slice(5)}`;
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
