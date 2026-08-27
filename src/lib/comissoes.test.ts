import { test } from "node:test";
import assert from "node:assert/strict";
import { somarComissoes, valorDaComissao } from "./comissoes";

const percentual = (p: number | null, pagoEm: Date | null = null) => ({
  tipo: "percentual" as const,
  percentual: p,
  valorFixo: null,
  pagoEm,
});

const fixo = (v: number | null, pagoEm: Date | null = null) => ({
  tipo: "fixo" as const,
  percentual: null,
  valorFixo: v,
  pagoEm,
});

test("percentual sai sobre o valor do orçamento", () => {
  assert.equal(valorDaComissao(percentual(10), 1_000_00), 100_00);
  assert.equal(valorDaComissao(percentual(7.5), 1_000_00), 75_00);
});

test("valor fixo ignora o orçamento", () => {
  assert.equal(valorDaComissao(fixo(250_00), 1_000_00), 250_00);
  assert.equal(valorDaComissao(fixo(250_00), null), 250_00);
});

// "Ainda não dá para calcular" é diferente de "não deve nada" — mostrar zero
// aqui faria a gestora achar que a obra não tem comissão.
test("percentual sem valor de orçamento devolve null, não zero", () => {
  assert.equal(valorDaComissao(percentual(10), null), null);
  assert.equal(valorDaComissao(percentual(10), 0), null);
});

test("linha sem comissão configurada devolve null", () => {
  assert.equal(valorDaComissao(percentual(null), 1_000_00), null);
  assert.equal(valorDaComissao(percentual(0), 1_000_00), null);
  assert.equal(valorDaComissao(fixo(null), 1_000_00), null);
  assert.equal(valorDaComissao(fixo(0), 1_000_00), null);
});

test("arredonda para centavo inteiro", () => {
  // 3,33% de R$ 1.000,00 = R$ 33,30
  assert.equal(valorDaComissao(percentual(3.33), 1_000_00), 33_30);
  // 1/3 de centavo não pode virar fração
  assert.equal(Number.isInteger(valorDaComissao(percentual(33.33), 999_99)), true);
});

test("resumo separa a pagar, pago e o que não dá para calcular", () => {
  const r = somarComissoes([
    { ...percentual(10), valorOrcamento: 1_000_00 },
    { ...fixo(200_00, new Date(2026, 7, 1)), valorOrcamento: 1_000_00 },
    { ...percentual(10), valorOrcamento: null },
  ]);
  assert.equal(r.aPagar, 100_00);
  assert.equal(r.pago, 200_00);
  assert.equal(r.semValor, 1);
});
