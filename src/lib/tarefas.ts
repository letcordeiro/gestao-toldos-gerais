// Módulo puro (sem banco e sem date-fns) para poder ser testado direto pelo
// node --test, como os outros de regra do sistema.

export type TipoTarefa =
  | "ligacao"
  | "whatsapp"
  | "visita"
  | "proposta"
  | "reuniao"
  | "nota";
export type PrioridadeTarefa = "baixa" | "media" | "alta";

/** Só a data, sem hora — é assim que prazo se compara. */
function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Diferença em dias de calendário (b − a), ignorando hora e fuso. */
function diasEntre(de: Date, ate: Date): number {
  const MS_DIA = 24 * 60 * 60 * 1000;
  return Math.round(
    (inicioDoDia(ate).getTime() - inicioDoDia(de).getTime()) / MS_DIA
  );
}

export const TIPO_TAREFA_LABEL: Record<TipoTarefa, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  visita: "Visita",
  proposta: "Proposta",
  reuniao: "Reunião",
  nota: "Anotação",
};

export const PRIORIDADE_LABEL: Record<PrioridadeTarefa, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

// Cor por prioridade — a mesma no painel, na lista e no atendimento.
export const PRIORIDADE_COR: Record<PrioridadeTarefa, string> = {
  baixa: "#94A3B8",
  media: "#F59E0B",
  alta: "#EF4444",
};

/**
 * Em que "gaveta" a tarefa cai. É o que organiza a tela: primeiro o que já
 * passou, depois hoje, depois o resto. Tarefa sem data prevista não cobra
 * prazo de ninguém — fica em "sem data".
 */
export type Gaveta = "atrasada" | "hoje" | "amanha" | "proximas" | "sem_data";

export const GAVETA_LABEL: Record<Gaveta, string> = {
  atrasada: "Atrasadas",
  hoje: "Hoje",
  amanha: "Amanhã",
  proximas: "Próximas",
  sem_data: "Sem data",
};

export function gavetaDaTarefa(
  prevista: Date | null,
  hoje = new Date()
): Gaveta {
  if (!prevista) return "sem_data";
  const dias = diasEntre(hoje, prevista);
  if (dias < 0) return "atrasada";
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanha";
  return "proximas";
}

/** Ordem em que as gavetas aparecem na tela. */
export const ORDEM_GAVETAS: Gaveta[] = [
  "atrasada",
  "hoje",
  "amanha",
  "proximas",
  "sem_data",
];

/** "há 3 dias" / "hoje" / "em 2 dias" — texto curto do prazo. */
export function textoPrazo(prevista: Date | null, hoje = new Date()): string {
  if (!prevista) return "sem data";
  const dias = diasEntre(hoje, prevista);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  if (dias < 0) return `há ${Math.abs(dias)} dias`;
  return `em ${dias} dias`;
}

/** Data prevista a partir de um prazo em dias contados de hoje. */
export function dataDoPrazo(prazoDias: number, base = new Date()): Date {
  const d = inicioDoDia(base);
  d.setDate(d.getDate() + prazoDias);
  return d;
}

/** Input "dd/mm/aaaa" ou "aaaa-mm-dd" → Date no início do dia. Null se inválida. */
export function parseDataBR(valor: string): Date | null {
  const texto = valor.trim();
  if (!texto) return null;
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Date → "aaaa-mm-dd" para preencher <input type="date">. */
export function paraInputDate(data: Date | null): string {
  if (!data) return "";
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}
