import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularNps, classificar, faixaNps } from "./pesquisa";

test("faixas do NPS: 9-10 promotor, 7-8 neutro, 0-6 detrator", () => {
  assert.equal(classificar(10), "promotor");
  assert.equal(classificar(9), "promotor");
  assert.equal(classificar(8), "neutro");
  assert.equal(classificar(7), "neutro");
  assert.equal(classificar(6), "detrator");
  assert.equal(classificar(0), "detrator");
});

test("sem resposta o NPS é null, não zero", () => {
  const r = calcularNps([]);
  assert.equal(r.nps, null);
  assert.equal(r.media, null);
  assert.equal(r.respostas, 0);
});

// Zero é uma nota legítima e diferente de "não respondeu" — o NPS de um
// detrator absoluto é −100, não 0.
test("nota zero conta como detrator", () => {
  const r = calcularNps([0]);
  assert.equal(r.nps, -100);
  assert.equal(r.detratores, 1);
});

test("neutro dilui o resultado mas não soma nem subtrai", () => {
  // 1 promotor, 1 neutro, 0 detratores → 50% − 0% = 50
  assert.equal(calcularNps([10, 8]).nps, 50);
  // Sem o neutro, o mesmo promotor vale 100.
  assert.equal(calcularNps([10]).nps, 100);
});

test("NPS = % promotores menos % detratores", () => {
  // 6 promotores, 2 neutros, 2 detratores em 10 → 60 − 20 = 40
  const notas = [10, 10, 10, 9, 9, 9, 8, 7, 6, 3];
  const r = calcularNps(notas);
  assert.equal(r.promotores, 6);
  assert.equal(r.neutros, 2);
  assert.equal(r.detratores, 2);
  assert.equal(r.nps, 40);
});

test("notas fora de 0–10 são descartadas", () => {
  const r = calcularNps([10, 11, -1, 8.5, 9]);
  assert.equal(r.respostas, 2);
  assert.equal(r.nps, 100);
});

test("média sai com uma casa decimal", () => {
  assert.equal(calcularNps([10, 9, 8]).media, 9);
  assert.equal(calcularNps([10, 9]).media, 9.5);
  assert.equal(calcularNps([10, 9, 7]).media, 8.7);
});

test("faixa traduz o número para quem lê", () => {
  assert.equal(faixaNps(null), "sem respostas ainda");
  assert.equal(faixaNps(80), "excelente");
  assert.equal(faixaNps(60), "muito bom");
  assert.equal(faixaNps(10), "razoável");
  assert.match(faixaNps(-20), /ruim/);
});
