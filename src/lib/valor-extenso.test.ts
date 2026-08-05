import { test } from "node:test";
import assert from "node:assert/strict";
import { numeroPorExtenso, valorPorExtenso } from "./valor-extenso";

test("numeroPorExtenso: casos do enunciado", () => {
  assert.equal(numeroPorExtenso(0), "zero");
  assert.equal(numeroPorExtenso(1), "um");
  assert.equal(numeroPorExtenso(100), "cem");
  assert.equal(numeroPorExtenso(999), "novecentos e noventa e nove");
  assert.equal(numeroPorExtenso(1000), "mil");
  assert.equal(numeroPorExtenso(3990), "três mil novecentos e noventa");
  assert.equal(
    numeroPorExtenso(1234567),
    "um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete"
  );
});

test("numeroPorExtenso: regra do 'e' entre grupos", () => {
  assert.equal(numeroPorExtenso(1500), "mil e quinhentos");
  assert.equal(numeroPorExtenso(1234), "mil duzentos e trinta e quatro");
  assert.equal(numeroPorExtenso(2000), "dois mil");
  assert.equal(numeroPorExtenso(2015), "dois mil e quinze");
  assert.equal(numeroPorExtenso(1000000), "um milhão");
  assert.equal(numeroPorExtenso(101), "cento e um");
  assert.equal(numeroPorExtenso(115), "cento e quinze");
  assert.equal(numeroPorExtenso(200), "duzentos");
});

test("valorPorExtenso: reais e centavos", () => {
  assert.equal(valorPorExtenso(1), "um centavo");
  assert.equal(valorPorExtenso(100), "um real");
  assert.equal(valorPorExtenso(999), "nove reais e noventa e nove centavos");
  assert.equal(valorPorExtenso(1000), "dez reais");
  assert.equal(valorPorExtenso(3990), "trinta e nove reais e noventa centavos");
  assert.equal(
    valorPorExtenso(1234567),
    "doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos"
  );
  assert.equal(valorPorExtenso(0), "zero real");
});

test("valorPorExtenso: valores típicos de contrato", () => {
  // R$ 1.995,00 — exemplo citado no texto da cláusula de pagamento
  assert.equal(
    valorPorExtenso(199500),
    "mil novecentos e noventa e cinco reais"
  );
  assert.equal(valorPorExtenso(399000), "três mil novecentos e noventa reais");
  assert.equal(valorPorExtenso(1000000), "dez mil reais");
  assert.equal(valorPorExtenso(150), "um real e cinquenta centavos");
});

test("valorPorExtenso: rejeita float", () => {
  assert.throws(() => valorPorExtenso(10.5));
});
