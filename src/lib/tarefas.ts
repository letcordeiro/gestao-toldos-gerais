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

/*
 * DATA SEM HORA (prazo de tarefa, previsão de entrega, prazo de cotação) é
 * gravada como MEIA-NOITE UTC daquele dia do calendário, e lida sempre com os
 * getters UTC. "Hoje" é o dia do calendário de BRASÍLIA.
 *
 * Antes cada lado usava o fuso da máquina: o servidor roda em UTC e o
 * navegador em Brasília. A tarefa de 07/10 (meia-noite UTC) aparecia no
 * navegador como 06/10 às 21h — "ontem / atrasada" na lista, e a janela de
 * editar mostrava 06/10: cada salvar tirava um dia. E das 21h à meia-noite o
 * servidor já achava que era amanhã (auditoria de 07/10/2026).
 *
 * Os dados antigos continuam certos: o servidor sempre esteve em UTC, então o
 * que ele gravou como "meia-noite local" já era meia-noite UTC.
 */
const MS_DIA = 24 * 60 * 60 * 1000;
const FUSO = "America/Sao_Paulo";

/** Dia do calendário de uma data-sem-hora gravada (meia-noite UTC). */
function diaGravado(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Dia do calendário de Brasília num instante (ex.: agora), como meia-noite UTC. */
function diaEmBrasilia(instante: Date): number {
  const [a, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(instante)
    .split("-")
    .map(Number);
  return Date.UTC(a, m - 1, d);
}

/** Dias de calendário de "hoje" (instante, lido em Brasília) até a data gravada. */
function diasEntre(hoje: Date, prevista: Date): number {
  return Math.round((diaGravado(prevista) - diaEmBrasilia(hoje)) / MS_DIA);
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
  return new Date(diaEmBrasilia(base) + prazoDias * MS_DIA);
}

/** Input "dd/mm/aaaa" ou "aaaa-mm-dd" → Date no início do dia. Null se inválida. */
export function parseDataBR(valor: string): Date | null {
  const texto = valor.trim();
  if (!texto) return null;
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const d = new Date(Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1])));
    return isNaN(d.getTime()) ? null : d;
  }
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Date → "aaaa-mm-dd" para preencher <input type="date">. */
export function paraInputDate(data: Date | null): string {
  if (!data) return "";
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");
  return `${data.getUTCFullYear()}-${mes}-${dia}`;
}
