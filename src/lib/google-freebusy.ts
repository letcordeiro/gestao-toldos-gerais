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

/**
 * A resposta veio com erro em algum calendário? O Google devolve 200 com
 * `calendars.primary.errors` e `busy: []` quando estoura limite ou não acha a
 * agenda — tratar isso como "agenda vazia" faz a atendente marcar visita em
 * cima de um compromisso (auditoria de 07/10/2026).
 */
export function freeBusyComErro(dados: unknown): boolean {
  const calendars = (dados as { calendars?: Record<string, unknown> })
    ?.calendars;
  if (!calendars || typeof calendars !== "object") return true;
  return Object.values(calendars).some((cal) => {
    const erros = (cal as { errors?: unknown })?.errors;
    return Array.isArray(erros) && erros.length > 0;
  });
}
