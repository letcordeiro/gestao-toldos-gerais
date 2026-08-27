// Módulo puro: quando cada parcela do contrato vence e em que situação ela
// está. Sem banco, para rodar no `node --test` — a régua de cobrança inteira
// depende dessa conta estar certa.

export type GatilhoVencimento =
  | "assinatura"
  | "inicio_fabricacao"
  | "entrega_material"
  | "conclusao_instalacao"
  | "dias_apos_instalacao"
  | "dias_apos_assinatura"
  | "data_fixa";

export type ParcelaParaCobranca = {
  gatilho: GatilhoVencimento;
  diasApos: number | null;
  /** "yyyy-MM-dd" ou Date — só nas parcelas de data fixa. */
  dataVencimento: Date | string | null;
  pagoEm: Date | null;
};

export type MarcosDoContrato = {
  dataAssinatura: Date | null;
  /** Conclusão da instalação (data de entrega da ficha). */
  dataEntrega: Date | null;
};

function paraData(v: Date | string | null): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function somarDias(base: Date, dias: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + dias);
  return d;
}

/**
 * Data em que a parcela vence de fato.
 *
 * Parcela presa a um evento só ganha data quando o evento acontece: antes da
 * assinatura, "50% na assinatura" não está vencido — está esperando. Devolver
 * `null` aqui é o que impede a régua de cobrar o cliente por algo que ainda
 * não era para ter acontecido.
 */
export function vencimentoEfetivo(
  parcela: ParcelaParaCobranca,
  marcos: MarcosDoContrato
): Date | null {
  const dias = parcela.diasApos ?? 0;
  switch (parcela.gatilho) {
    case "data_fixa":
      return paraData(parcela.dataVencimento);
    case "assinatura":
      return marcos.dataAssinatura;
    case "dias_apos_assinatura":
      return marcos.dataAssinatura
        ? somarDias(marcos.dataAssinatura, dias)
        : null;
    case "conclusao_instalacao":
      return marcos.dataEntrega;
    case "dias_apos_instalacao":
      return marcos.dataEntrega ? somarDias(marcos.dataEntrega, dias) : null;
    // Fabricação e entrega de material não têm data registrada no sistema.
    case "inicio_fabricacao":
    case "entrega_material":
      return null;
  }
}

export type SituacaoParcela = "paga" | "vencida" | "a_vencer" | "sem_data";

export function situacaoParcela(
  parcela: ParcelaParaCobranca,
  marcos: MarcosDoContrato,
  hoje = new Date()
): SituacaoParcela {
  if (parcela.pagoEm) return "paga";
  const venc = vencimentoEfetivo(parcela, marcos);
  if (!venc) return "sem_data";
  const zeroHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return venc < zeroHoje ? "vencida" : "a_vencer";
}

/** Dias de atraso (0 quando não está vencida). */
export function diasDeAtraso(
  parcela: ParcelaParaCobranca,
  marcos: MarcosDoContrato,
  hoje = new Date()
): number {
  const venc = vencimentoEfetivo(parcela, marcos);
  if (!venc || parcela.pagoEm) return 0;
  const MS_DIA = 24 * 60 * 60 * 1000;
  const zeroHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const atraso = Math.round((zeroHoje.getTime() - venc.getTime()) / MS_DIA);
  return atraso > 0 ? atraso : 0;
}

export const SITUACAO_LABEL: Record<SituacaoParcela, string> = {
  paga: "Recebida",
  vencida: "Vencida",
  a_vencer: "A vencer",
  sem_data: "Aguardando o evento",
};

