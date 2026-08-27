// Textos padrão da Proposta Técnica Comercial.
// TODO: conferir redação final com o João (modelo real da empresa).

export const MONTAGEM_COBERTURA =
  "Montagem por equipe própria da Toldos Gerais, com EPIs e conforme as " +
  "normas técnicas. O local é entregue limpo ao fim dos serviços.";

export const GARANTIA_PADRAO =
  "1 (um) ano contra defeitos de fabricação e instalação, a partir da conclusão da montagem.";

export const FORMA_PAGAMENTO_PADRAO =
  "50% de entrada na aprovação e 50% na conclusão da instalação.";

// Prazo de entrega fixo (padrão). O número de dias pode ser alterado por orçamento.
export const PRAZO_ENTREGA_PADRAO =
  "20 (vinte) dias úteis a partir da confirmação do pedido e do pagamento da entrada.";

/**
 * Texto de validade da proposta. A contagem começa no envio ao cliente; se o
 * orçamento ainda é rascunho, vale a data de criação. Null = sem prazo.
 */
export function textoValidade(
  validadeDias: number | null,
  base: Date
): string | null {
  if (validadeDias == null || validadeDias <= 0) return null;
  const limite = new Date(base);
  limite.setDate(limite.getDate() + validadeDias);
  const dia = String(limite.getDate()).padStart(2, "0");
  const mes = String(limite.getMonth() + 1).padStart(2, "0");
  return `Proposta válida até ${dia}/${mes}/${limite.getFullYear()} (${validadeDias} dias).`;
}

/** A/c da proposta: o que foi digitado ou, na falta, o nome do cliente. */
export function aosCuidados(
  aosCuidadosDe: string | null,
  clienteNome: string
): string {
  return aosCuidadosDe?.trim() || clienteNome;
}
