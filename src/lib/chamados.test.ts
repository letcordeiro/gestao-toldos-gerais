import { test } from "node:test";
import assert from "node:assert/strict";
import { avaliarGarantia, descricaoServico, linhasDaFicha } from "./chamados";

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

// --- Ordem de manutenção -----------------------------------------------------

test("vedação vale pelo rótulo, mesmo com texto solto sobrando", () => {
  assert.equal(descricaoServico("vedacao", "ignorar isto"), "Vedação");
});

test('"outros" imprime a descrição, não a palavra "Outros"', () => {
  assert.equal(descricaoServico("outros", " troca do motor "), "troca do motor");
});

test('"outros" sem descrição ainda imprime alguma coisa', () => {
  assert.equal(descricaoServico("outros", null), "Outros");
});

test("serviço não escolhido não inventa rótulo", () => {
  assert.equal(descricaoServico(null, null), "");
  assert.equal(descricaoServico(undefined, "  "), "");
});

test("a ficha sempre sai com o mesmo número de linhas", () => {
  assert.equal(linhasDaFicha(null).length, 4);
  assert.equal(linhasDaFicha("uma linha só").length, 4);
  assert.deepEqual(linhasDaFicha("curto", 3), ["curto", "", ""]);
});

test("o relato quebra por palavra, sem cortar no meio", () => {
  const linhas = linhasDaFicha("aaa bbb ccc ddd", 3, 7);
  assert.deepEqual(linhas, ["aaa bbb", "ccc ddd", ""]);
});

test("palavra maior que a linha é cortada em vez de estourar a margem", () => {
  const linhas = linhasDaFicha("abcdefghij", 3, 4);
  assert.deepEqual(linhas, ["abcd", "efgh", "ij"]);
});

test("relato longo demais é cortado no total de linhas da ficha", () => {
  const linhas = linhasDaFicha("aaa bbb ccc ddd eee fff", 2, 7);
  assert.equal(linhas.length, 2);
  assert.deepEqual(linhas, ["aaa bbb", "ccc ddd"]);
});

test("quebra de linha e espaço repetido viram um espaço só", () => {
  assert.deepEqual(linhasDaFicha("goteira\n\n  na   emenda", 1), [
    "goteira na emenda",
  ]);
});
