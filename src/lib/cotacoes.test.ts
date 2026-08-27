import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compararCotacoes,
  melhorTotal,
  type ItemCotacao,
  type RespostaFornecedor,
} from "./cotacoes";

const itens: ItemCotacao[] = [
  { id: 1, descricao: "Lona PVC", quantidade: "12", unidade: "m²" },
  { id: 2, descricao: "Perfil de alumínio", quantidade: "8", unidade: "barra" },
];

const resposta = (
  conviteId: number,
  nome: string,
  valores: [number, number | null][],
  respondeu = true
): RespostaFornecedor => ({
  conviteId,
  fornecedorNome: nome,
  respondidoEm: respondeu ? new Date(2026, 7, 20) : null,
  prazoEntrega: null,
  observacao: null,
  valores: new Map(valores),
});

test("marca o menor preço de cada item", () => {
  const colunas = compararCotacoes(itens, [
    resposta(1, "A", [
      [1, 100_00],
      [2, 90_00],
    ]),
    resposta(2, "B", [
      [1, 80_00],
      [2, 95_00],
    ]),
  ]);
  assert.equal(colunas[0].celulas[0].melhor, false); // A na lona: mais caro
  assert.equal(colunas[0].celulas[1].melhor, true); // A no perfil: mais barato
  assert.equal(colunas[1].celulas[0].melhor, true); // B na lona: mais barato
  assert.equal(colunas[1].celulas[1].melhor, false);
});

test("empate marca os dois como melhor — quem decide é a gestora", () => {
  const colunas = compararCotacoes([itens[0]], [
    resposta(1, "A", [[1, 100_00]]),
    resposta(2, "B", [[1, 100_00]]),
  ]);
  assert.equal(colunas[0].celulas[0].melhor, true);
  assert.equal(colunas[1].celulas[0].melhor, true);
});

test("item não cotado não vira zero nem entra na disputa", () => {
  const colunas = compararCotacoes(itens, [
    resposta(1, "A", [
      [1, 100_00],
      [2, null],
    ]),
    resposta(2, "B", [[1, 120_00]]),
  ]);
  assert.equal(colunas[0].celulas[1].valor, null);
  assert.equal(colunas[0].celulas[1].melhor, false);
  assert.equal(colunas[0].total, 100_00);
  assert.equal(colunas[0].totalCompleto, false);
});

// Somar cotação parcial engana: quem cotou 1 de 2 itens sempre pareceria o
// mais barato.
test("só quem cotou a lista inteira disputa o melhor total", () => {
  const colunas = compararCotacoes(itens, [
    resposta(1, "Parcial", [[1, 10_00]]),
    resposta(2, "Completo", [
      [1, 100_00],
      [2, 90_00],
    ]),
  ]);
  assert.equal(colunas[0].totalCompleto, false);
  assert.equal(colunas[1].totalCompleto, true);
  assert.equal(melhorTotal(colunas), 190_00);
});

test("sem ninguém completo não há melhor total", () => {
  const colunas = compararCotacoes(itens, [resposta(1, "A", [[1, 10_00]])]);
  assert.equal(melhorTotal(colunas), null);
});

test("fornecedor que não respondeu aparece com total nulo", () => {
  const colunas = compararCotacoes(itens, [resposta(1, "A", [], false)]);
  assert.equal(colunas[0].respondeu, false);
  assert.equal(colunas[0].total, null);
  assert.equal(colunas[0].totalCompleto, false);
});
