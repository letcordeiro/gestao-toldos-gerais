// Leitura da resposta free/busy do Google. Pura: sem rede, sem banco.
//
// Fica separada porque o formato vem de FORA. Um campo faltando viraria
// `new Date(undefined)` — um intervalo inválido que atravessa o cálculo em
// silêncio e some com horários livres sem ninguém entender por quê.

import type { Intervalo } from "./disponibilidade";

/** Lê a resposta do free/busy, descartando o que não dá para confiar. */
export function lerFreeBusy(dados: unknown): Intervalo[] {
  const calendars = (dados as { calendars?: Record<string, unknown> })
    ?.calendars;
  if (!calendars || typeof calendars !== "object") return [];

  const intervalos: Intervalo[] = [];
  for (const cal of Object.values(calendars)) {
    const busy = (cal as { busy?: unknown })?.busy;
    if (!Array.isArray(busy)) continue;
    for (const b of busy) {
      const inicio = new Date(String((b as { start?: string })?.start ?? ""));
      const fim = new Date(String((b as { end?: string })?.end ?? ""));
      if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) continue;
      if (fim.getTime() <= inicio.getTime()) continue;
      intervalos.push({ inicio, fim });
    }
  }
  return intervalos;
}
