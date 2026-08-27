// Rótulos e regra de garantia dos chamados. Puro — a conta de garantia
// decide quem paga a visita, então tem teste.

export type SituacaoChamado =
  | "aberto"
  | "em_andamento"
  | "resolvido"
  | "cancelado";

export const SITUACAO_CHAMADO_LABEL: Record<SituacaoChamado, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
};

export const SITUACAO_CHAMADO_COR: Record<SituacaoChamado, string> = {
  aberto: "#EF4444",
  em_andamento: "#F59E0B",
  resolvido: "#10B981",
  cancelado: "#94A3B8",
};

/** Situações em que o chamado ainda pede trabalho de alguém. */
export const SITUACOES_ABERTAS: SituacaoChamado[] = ["aberto", "em_andamento"];

export type TipoChamado = "receptivo" | "ativo";

export const TIPO_CHAMADO_LABEL: Record<TipoChamado, string> = {
  receptivo: "Cliente procurou",
  ativo: "Nós procuramos",
};

export type StatusGarantia = "dentro" | "fora" | "indefinida";

export type ResultadoGarantia = {
  status: StatusGarantia;
  /** Dias que ainda faltam (dentro) ou que já passaram (fora). */
  dias: number | null;
  texto: string;
};

/**
 * A garantia corre a partir da CONCLUSÃO da instalação, não da venda.
 * Sem data de entrega registrada não dá para afirmar nada — e afirmar errado
 * aqui é a diferença entre a empresa pagar a visita ou cobrar do cliente.
 */
export function avaliarGarantia(
  dataEntrega: Date | null,
  garantiaMeses: number,
  hoje = new Date()
): ResultadoGarantia {
  if (!dataEntrega) {
    return {
      status: "indefinida",
      dias: null,
      texto: "Sem data de entrega registrada — confira a ficha de instalação.",
    };
  }
  const fim = new Date(dataEntrega);
  fim.setMonth(fim.getMonth() + garantiaMeses);

  const MS_DIA = 24 * 60 * 60 * 1000;
  const zero = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dias = Math.round((zero(fim).getTime() - zero(hoje).getTime()) / MS_DIA);

  if (dias >= 0) {
    return {
      status: "dentro",
      dias,
      texto:
        dias === 0
          ? "Último dia de garantia."
          : `Na garantia — faltam ${dias} dia(s).`,
    };
  }
  return {
    status: "fora",
    dias: Math.abs(dias),
    texto: `Fora da garantia há ${Math.abs(dias)} dia(s).`,
  };
}

export const GARANTIA_COR: Record<StatusGarantia, string> = {
  dentro: "#10B981",
  fora: "#EF4444",
  indefinida: "#94A3B8",
};
