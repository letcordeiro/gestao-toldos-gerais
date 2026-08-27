import { test } from "node:test";
import assert from "node:assert/strict";
import { avaliarGarantia } from "./chamados";

const HOJE = new Date(2026, 7, 27); // 27/08/2026

test("sem data de entrega a garantia é indefinida, não expirada", () => {
  const r = avaliarGarantia(null, 12, HOJE);
  assert.equal(r.status, "indefinida");
  assert.equal(r.dias, null);
  assert.match(r.texto, /ficha de instalação/);
});

test("dentro do prazo conta os dias que faltam", () => {
  // Entregue em 01/08/2026, garantia de 12 meses → vence 01/08/2027.
  const r = avaliarGarantia(new Date(2026, 7, 1), 12, HOJE);
  assert.equal(r.status, "dentro");
  assert.equal(r.dias, 339);
});

test("fora do prazo conta os dias passados", () => {
  // Entregue em 01/08/2025, garantia de 12 meses → venceu 01/08/2026.
  const r = avaliarGarantia(new Date(2025, 7, 1), 12, HOJE);
  assert.equal(r.status, "fora");
  assert.equal(r.dias, 26);
  assert.match(r.texto, /Fora da garantia/);
});

// A diferença entre a empresa pagar a visita e cobrar do cliente é um dia.
test("o último dia ainda está na garantia", () => {
  const r = avaliarGarantia(new Date(2025, 7, 27), 12, HOJE);
  assert.equal(r.status, "dentro");
  assert.equal(r.dias, 0);
  assert.match(r.texto, /Último dia/);
});

test("o dia seguinte ao vencimento já está fora", () => {
  const r = avaliarGarantia(new Date(2025, 7, 26), 12, HOJE);
  assert.equal(r.status, "fora");
  assert.equal(r.dias, 1);
});

test("prazo diferente do padrão é respeitado", () => {
  // 6 meses a partir de 01/08/2026 → vence 01/02/2027, ainda dentro.
  assert.equal(avaliarGarantia(new Date(2026, 7, 1), 6, HOJE).status, "dentro");
  // 3 meses a partir de 01/01/2026 → venceu 01/04/2026.
  assert.equal(avaliarGarantia(new Date(2026, 0, 1), 3, HOJE).status, "fora");
});

test("hora do dia não muda o resultado", () => {
  const manha = avaliarGarantia(new Date(2025, 7, 27, 8), 12, HOJE);
  const noite = avaliarGarantia(new Date(2025, 7, 27, 23), 12, HOJE);
  assert.equal(manha.dias, noite.dias);
});
