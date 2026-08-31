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

// ---------------------------------------------------------------------------
// ORDEM DE MANUTENÇÃO
// A ficha que a equipe leva impressa para o cliente assinar no local.
// ---------------------------------------------------------------------------

export type TipoServico = "vedacao" | "outros";

export const TIPO_SERVICO_LABEL: Record<TipoServico, string> = {
  vedacao: "Vedação",
  outros: "Outros",
};

/**
 * O que sai escrito no campo "Serviço" da ficha.
 *
 * "Outros" sozinho não diz nada a quem recebe o papel, então quando há
 * descrição ela é que manda; sem tipo escolhido, devolve string vazia para o
 * PDF imprimir a linha em branco e alguém preencher à mão.
 */
export function descricaoServico(
  tipo: TipoServico | null | undefined,
  outros: string | null | undefined
): string {
  const texto = (outros ?? "").trim();
  if (!tipo) return texto;
  if (tipo === "vedacao") return TIPO_SERVICO_LABEL.vedacao;
  return texto || TIPO_SERVICO_LABEL.outros;
}

/**
 * Quebra o relato do cliente nas linhas de escrita da ficha impressa.
 *
 * Devolve SEMPRE `total` linhas: as que sobram saem em branco, porque a ficha
 * é papel de trabalho — o instalador anota nelas o que encontrou no local.
 * Palavra maior que a linha é cortada em vez de estourar a margem, e o que não
 * couber em `total` linhas é descartado: o relato completo continua na tela.
 */
export function linhasDaFicha(
  texto: string | null | undefined,
  total = 4,
  porLinha = 95
): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of (texto ?? "").replace(/\s+/g, " ").trim().split(" ")) {
    if (!palavra) continue;
    let p = palavra;
    while (p.length > porLinha) {
      if (atual) {
        linhas.push(atual);
        atual = "";
      }
      linhas.push(p.slice(0, porLinha));
      p = p.slice(porLinha);
    }
    if (!atual) atual = p;
    else if (atual.length + 1 + p.length <= porLinha) atual += ` ${p}`;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  return Array.from({ length: total }, (_, i) => linhas[i] ?? "");
}
