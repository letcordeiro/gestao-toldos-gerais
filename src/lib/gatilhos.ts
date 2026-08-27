// Módulo puro: só rótulo e texto de regra. Quem executa (e fala com o banco)
// é `gatilhos-executor.ts` — este aqui é importado por componente de cliente,
// e um import de banco aqui arrasta o better-sqlite3 para o navegador.

export type EventoGatilho =
  | "entrou_na_fase"
  | "orcamento_enviado"
  | "orcamento_aprovado"
  | "orcamento_recusado"
  | "contrato_emitido"
  | "contrato_assinado";

export const EVENTO_LABEL: Record<EventoGatilho, string> = {
  entrou_na_fase: "o atendimento entrar numa fase",
  orcamento_enviado: "um orçamento for enviado",
  orcamento_aprovado: "um orçamento for aprovado",
  orcamento_recusado: "um orçamento for recusado",
  contrato_emitido: "um contrato for emitido",
  contrato_assinado: "um contrato for assinado",
};

/** Frase completa da regra, do jeito que aparece na listagem. */
export function descreverGatilho(
  g: {
    evento: EventoGatilho;
    tarefaTitulo: string;
    prazoDias: number;
  },
  faseNome?: string | null
): string {
  const quando =
    g.evento === "entrou_na_fase"
      ? `Quando o atendimento entrar em "${faseNome ?? "…"}"`
      : `Quando ${EVENTO_LABEL[g.evento]}`;
  const prazo =
    g.prazoDias === 0
      ? "para hoje"
      : g.prazoDias === 1
        ? "para amanhã"
        : `em ${g.prazoDias} dias`;
  return `${quando}, criar a tarefa "${g.tarefaTitulo}" ${prazo}`;
}
