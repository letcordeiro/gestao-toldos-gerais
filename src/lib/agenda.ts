// Agenda do próprio sistema — regras puras, sem banco (13/10/2026).
//
// A Letícia pediu a agenda "sem vincular no Google": o app do Google está
// preso em modo Teste e a conexão cai a cada 7 dias. O que o Google dava — "a
// que horas o vendedor NÃO pode" — vira BLOQUEIO aqui dentro. E o problema que
// ela levantou em 31/08 (o João faz faculdade; travar a agenda toda semana não
// é eficaz) é o bloqueio SEMANAL: cadastra uma vez, vale toda semana.

import type { Intervalo } from "./disponibilidade";

export type Recorrencia = "unico" | "semanal";

export type Bloqueio = {
  id: number;
  vendedorId: number;
  recorrencia: Recorrencia;
  /** "aaaa-mm-dd": o dia (único) ou o início da vigência (semanal). */
  data: string | null;
  /** 0 = domingo … 6 = sábado (semanal). */
  diaSemana: number | null;
  inicioMin: number;
  fimMin: number;
  /** Semanal: último dia que vale. */
  ate: string | null;
  motivo: string | null;
};

export const DIAS_SEMANA = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
] as const;

const DIA_INTEIRO = { inicio: 0, fim: 24 * 60 };

/** "aaaa-mm-dd" válido? */
export function ehDiaISO(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [a, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  return t.getUTCFullYear() === a && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** Dia da semana de um "aaaa-mm-dd" (0 = domingo), sem fuso no meio. */
export function diaDaSemana(diaISO: string): number {
  const [a, m, d] = diaISO.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** "19:30" → 1170 minutos. Null se inválido. */
export function minutosDe(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

/** 1170 → "19:30". */
export function hhmmDe(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** O bloqueio vale neste dia? */
export function valeNoDia(b: Bloqueio, diaISO: string): boolean {
  if (b.recorrencia === "unico") return b.data === diaISO;
  if (b.diaSemana !== diaDaSemana(diaISO)) return false;
  // Comparação de texto "aaaa-mm-dd" já é ordem de calendário.
  if (b.data && diaISO < b.data) return false;
  if (b.ate && diaISO > b.ate) return false;
  return true;
}

/**
 * Os bloqueios do dia como intervalos de tempo, no MESMO relógio que o resto
 * da agenda usa (`new Date(ano, mes, dia, h, m)`, como `janelaDoDia`) — senão
 * o bloqueio das 19h cairia três horas fora do lugar no servidor em UTC.
 */
export function intervalosDoDia(bloqueios: Bloqueio[], diaISO: string): Intervalo[] {
  const [a, m, d] = diaISO.split("-").map(Number);
  return bloqueios
    .filter((b) => valeNoDia(b, diaISO))
    .map((b) => ({
      inicio: new Date(a, m - 1, d, 0, b.inicioMin),
      fim: new Date(a, m - 1, d, 0, b.fimMin),
    }));
}

export function ehDiaInteiro(b: Pick<Bloqueio, "inicioMin" | "fimMin">): boolean {
  return b.inicioMin <= DIA_INTEIRO.inicio && b.fimMin >= DIA_INTEIRO.fim;
}

/** "Toda terça, 19:00 às 22:00" / "13/10/2026, dia inteiro". */
export function descreverBloqueio(b: Bloqueio): string {
  const horario = ehDiaInteiro(b)
    ? "dia inteiro"
    : `${hhmmDe(b.inicioMin)} às ${hhmmDe(b.fimMin)}`;
  if (b.recorrencia === "semanal") {
    const dia = DIAS_SEMANA[b.diaSemana ?? 0];
    const desde = b.data ? ` a partir de ${dataBR(b.data)}` : "";
    const ate = b.ate ? ` até ${dataBR(b.ate)}` : "";
    const prefixo = b.diaSemana === 0 || b.diaSemana === 6 ? "Todo" : "Toda";
    return `${prefixo} ${dia}, ${horario}${desde}${ate}`;
  }
  return `${b.data ? dataBR(b.data) : "?"}, ${horario}`;
}

/** Bloqueio único que já passou não precisa mais aparecer na lista. */
export function bloqueioEncerrado(b: Bloqueio, hojeISO: string): boolean {
  if (b.recorrencia === "unico") return (b.data ?? "") < hojeISO;
  return b.ate != null && b.ate < hojeISO;
}

/** Valida o que veio do formulário. Devolve a mensagem de erro ou null. */
export function validarBloqueio(b: Omit<Bloqueio, "id" | "vendedorId" | "motivo">): string | null {
  if (b.inicioMin < 0 || b.fimMin > DIA_INTEIRO.fim || b.fimMin <= b.inicioMin) {
    return "O fim do horário precisa ser depois do início.";
  }
  if (b.recorrencia === "unico") {
    if (!ehDiaISO(b.data)) return "Escolha o dia.";
    return null;
  }
  if (b.diaSemana == null || b.diaSemana < 0 || b.diaSemana > 6) {
    return "Escolha o dia da semana.";
  }
  if (b.data && !ehDiaISO(b.data)) return "Data de início inválida.";
  if (b.ate && !ehDiaISO(b.ate)) return "Data final inválida.";
  if (b.data && b.ate && b.ate < b.data) return "A data final é antes do início.";
  return null;
}

// --- Semana na tela ---------------------------------------------------------

/** "Hoje" no calendário de Brasília (o servidor roda em UTC). */
export function hojeISO(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Soma dias a um "aaaa-mm-dd". */
export function somarDias(diaISO: string, dias: number): string {
  const [a, m, d] = diaISO.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Segunda-feira da semana do dia (a agenda abre na segunda). */
export function segundaDaSemana(diaISO: string): string {
  const dow = diaDaSemana(diaISO); // 0 = domingo
  return somarDias(diaISO, dow === 0 ? -6 : 1 - dow);
}

/** Os 7 dias (segunda a domingo) da semana que começa em `segunda`. */
export function diasDaSemana(segunda: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

function dataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
