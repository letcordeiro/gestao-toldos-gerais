import { test } from "node:test";
import assert from "node:assert/strict";
import { podeComercial, podeOrcar, veFunilInteiro, PAPEL_LABEL, type Papel } from "./papeis";

const PAPEIS: Papel[] = ["gestor", "atendente", "vendedor"];

test("veFunilInteiro: gestor e atendente veem tudo; vendedor só o seu", () => {
  assert.equal(veFunilInteiro("gestor"), true);
  assert.equal(veFunilInteiro("atendente"), true);
  assert.equal(veFunilInteiro("vendedor"), false);
});

test("podeComercial: atendente não cria contrato, ficha nem cotação", () => {
  assert.equal(podeComercial("gestor"), true);
  assert.equal(podeComercial("vendedor"), true);
  assert.equal(podeComercial("atendente"), false);
});

test("atendente: direciona o cliente, mas não é o comercial", () => {
  // é exatamente o pedido: enxerga o funil inteiro para distribuir,
  // sem poder mexer em orçamento/contrato
  assert.equal(veFunilInteiro("atendente") && !podeComercial("atendente"), true);
});

test("todo papel tem rótulo", () => {
  for (const p of PAPEIS) assert.equal(typeof PAPEL_LABEL[p], "string");
});

test("podeOrcar: atendente monta orçamento (07/10/2026), mas contrato não", () => {
  assert.equal(podeOrcar("gestor"), true);
  assert.equal(podeOrcar("vendedor"), true);
  assert.equal(podeOrcar("atendente"), true);
  assert.equal(podeComercial("atendente"), false);
});
