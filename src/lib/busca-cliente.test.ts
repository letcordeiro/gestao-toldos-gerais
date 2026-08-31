import { test } from "node:test";
import assert from "node:assert/strict";
import { combinaBusca, compararNomes, normalizar } from "./busca-cliente";

test("acha o nome no meio, não só no começo", () => {
  assert.ok(combinaBusca("João Carlos Ferreira — (31) 97000-0004", "carlos"));
  assert.ok(combinaBusca("Marina Carlos de Assis — (31) 97000-0006", "carlos"));
  assert.ok(combinaBusca("Carlos Eduardo Muniz — (31) 97000-0002", "carlos"));
  assert.ok(!combinaBusca("Bruno Sales — (31) 97000-0005", "carlos"));
});

test("acento e cedilha não escondem o cliente", () => {
  assert.ok(combinaBusca("Roberto Gonçalves", "goncalves"));
  assert.ok(combinaBusca("Roberto Goncalves", "gonçalves"));
  assert.ok(combinaBusca("Édson Nogueira", "edson"));
  assert.ok(combinaBusca("Patrícia Lima", "PATRICIA"));
});

test("as palavras podem vir em qualquer ordem", () => {
  assert.ok(combinaBusca("João Carlos Ferreira", "ferreira carlos"));
  assert.ok(combinaBusca("João Carlos Ferreira", "carlos ferreira"));
  assert.ok(!combinaBusca("João Carlos Ferreira", "carlos muniz"));
});

test("busca pelo telefone também", () => {
  assert.ok(combinaBusca("Bruno Sales — (31) 97000-0005", "97000-0005"));
});

test("busca vazia devolve todo mundo", () => {
  assert.ok(combinaBusca("qualquer um", ""));
  assert.ok(combinaBusca("qualquer um", "   "));
});

test("ordem alfabética trata acento como a letra sem acento", () => {
  const nomes = [
    "Zuleica Prates",
    "Édson Nogueira",
    "Ana Beatriz Rezende",
    "João Carlos Ferreira",
  ];
  assert.deepEqual([...nomes].sort(compararNomes), [
    "Ana Beatriz Rezende",
    "Édson Nogueira",
    "João Carlos Ferreira",
    "Zuleica Prates",
  ]);
});

test("normalizar tira acento, caixa e espaço das pontas", () => {
  assert.equal(normalizar("  Gonçalves  "), "goncalves");
});
