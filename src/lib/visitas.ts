// Regras da agenda de visitas. Puro — dá para testar a montagem da rota e o
// agrupamento por dia sem subir banco nem navegador.

export type SituacaoVisita =
  | "agendada"
  | "confirmada"
  | "realizada"
  | "cancelada"
  | "nao_compareceu";

export const SITUACAO_VISITA_LABEL: Record<SituacaoVisita, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  nao_compareceu: "Não compareceu",
};

export const SITUACAO_VISITA_COR: Record<SituacaoVisita, string> = {
  agendada: "#F59E0B",
  confirmada: "#3B82F6",
  realizada: "#10B981",
  cancelada: "#94A3B8",
  nao_compareceu: "#EF4444",
};

/** Situações em que a visita ainda vai acontecer. */
export const SITUACOES_EM_PE: SituacaoVisita[] = ["agendada", "confirmada"];

export type VisitaNaAgenda = {
  id: number;
  inicioEm: Date;
  duracaoMin: number;
  endereco: string | null;
  situacao: SituacaoVisita;
  clienteNome: string;
};

/** Chave do dia ("2026-08-28"), estável e ordenável. */
export function chaveDoDia(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export type DiaDeVisitas<T extends VisitaNaAgenda> = {
  chave: string;
  data: Date;
  visitas: T[];
};

/**
 * Agrupa por dia e ordena por horário dentro do dia.
 *
 * A ordem do dia é a ordem em que a pessoa vai dirigir — é ela que vira a
 * rota, então tem que ser por horário, nunca por nome ou por cadastro.
 */
export function agruparPorDia<T extends VisitaNaAgenda>(
  visitas: T[]
): DiaDeVisitas<T>[] {
  const dias = new Map<string, T[]>();
  for (const v of visitas) {
    const chave = chaveDoDia(v.inicioEm);
    dias.set(chave, [...(dias.get(chave) ?? []), v]);
  }
  return [...dias.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, lista]) => {
      const ordenadas = [...lista].sort(
        (a, b) => a.inicioEm.getTime() - b.inicioEm.getTime()
      );
      return { chave, data: ordenadas[0].inicioEm, visitas: ordenadas };
    });
}

/** Fim previsto da visita — usado para avisar quando duas se sobrepõem. */
export function fimDaVisita(v: {
  inicioEm: Date;
  duracaoMin: number;
}): Date {
  return new Date(v.inicioEm.getTime() + v.duracaoMin * 60 * 1000);
}

/**
 * Visitas que se atropelam no mesmo dia (uma começa antes da anterior acabar).
 * Devolve o id da que começa depois — é a que precisa ser remarcada.
 */
export function conflitos<T extends VisitaNaAgenda>(visitas: T[]): number[] {
  const emPe = visitas
    .filter((v) => SITUACOES_EM_PE.includes(v.situacao))
    .sort((a, b) => a.inicioEm.getTime() - b.inicioEm.getTime());
  const ids: number[] = [];
  for (let i = 1; i < emPe.length; i++) {
    if (emPe[i].inicioEm < fimDaVisita(emPe[i - 1])) ids.push(emPe[i].id);
  }
  return ids;
}

const MAX_PARADAS_NA_ROTA = 10;

/**
 * Link de rota no Google Maps, na ORDEM DOS HORÁRIOS.
 *
 * Usa a URL pública do Maps: sem chave de API, sem custo e abre no celular no
 * app nativo. Não reordena as paradas de propósito — o vendedor marcou 9h com
 * um e 11h com outro; otimizar a rota quebraria os compromissos.
 *
 * Null quando não há pelo menos dois endereços — rota de uma parada só é o
 * mesmo que abrir o endereço, e para isso já existe o link de cada linha.
 */
export function linkDaRota(
  visitas: VisitaNaAgenda[],
  partida?: string | null
): string | null {
  const paradas = visitas
    .filter((v) => SITUACOES_EM_PE.includes(v.situacao))
    .map((v) => v.endereco?.trim())
    .filter((e): e is string => Boolean(e));

  if (paradas.length < 2 && !(partida && paradas.length >= 1)) return null;

  const limitadas = paradas.slice(0, MAX_PARADAS_NA_ROTA);
  const destino = limitadas[limitadas.length - 1];
  const meio = limitadas.slice(0, -1);

  const params = new URLSearchParams({ api: "1", destination: destino });
  if (partida?.trim()) {
    params.set("origin", partida.trim());
    if (meio.length > 0) params.set("waypoints", meio.join("|"));
  } else if (meio.length > 0) {
    // Sem ponto de partida, a primeira visita vira a origem.
    params.set("origin", meio[0]);
    if (meio.length > 1) params.set("waypoints", meio.slice(1).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Quantas paradas ficaram de fora do link, por causa do limite do Maps. */
export function paradasForaDaRota(visitas: VisitaNaAgenda[]): number {
  const n = visitas.filter(
    (v) => SITUACOES_EM_PE.includes(v.situacao) && v.endereco?.trim()
  ).length;
  return Math.max(0, n - MAX_PARADAS_NA_ROTA);
}

/** Link de um endereço só, para abrir no mapa direto da linha. */
export function linkDoEndereco(endereco: string | null): string | null {
  if (!endereco?.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco.trim())}`;
}
