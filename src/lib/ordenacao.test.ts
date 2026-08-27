import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compararValores,
  direcaoDe,
  linkDaColuna,
  ordenarLista,
} from "./ordenacao";

test("direcaoDe: só 'desc' inverte", () => {
  assert.equal(direcaoDe(undefined), "asc");
  assert.equal(direcaoDe(""), "asc");
  assert.equal(direcaoDe("asc"), "asc");
  assert.equal(direcaoDe("qualquer"), "asc");
  assert.equal(direcaoDe("desc"), "desc");
});

test("texto ordena com acento e sem diferenciar maiúscula", () => {
  const nomes = ["Ávila", "avelar", "Bastos", "ana"];
  const asc = ordenarLista(nomes, "n", "asc", { n: (x) => x });
  assert.deepEqual(asc, ["ana", "avelar", "Ávila", "Bastos"]);
});

test("números ordenam por valor, não como texto", () => {
  const vs = [{ v: 9 }, { v: 100 }, { v: 20 }];
  assert.deepEqual(
    ordenarLista(vs, "v", "asc", { v: (x) => x.v }).map((x) => x.v),
    [9, 20, 100]
  );
});

test("datas ordenam por tempo", () => {
  const ds = [
    { d: new Date("2026-03-01") },
    { d: new Date("2026-01-15") },
    { d: new Date("2026-02-20") },
  ];
  assert.deepEqual(
    ordenarLista(ds, "d", "desc", { d: (x) => x.d }).map((x) =>
      x.d.toISOString().slice(0, 10)
    ),
    ["2026-03-01", "2026-02-20", "2026-01-15"]
  );
});

test("vazio vai para o fim nos dois sentidos", () => {
  const vs = [{ v: "b" }, { v: null }, { v: "a" }, { v: "" }];
  const campos = { v: (x: { v: string | null }) => x.v };
  assert.deepEqual(
    ordenarLista(vs, "v", "asc", campos).map((x) => x.v),
    ["a", "b", null, ""]
  );
  // no decrescente o vazio continua no fim — senão a primeira tela fica em branco
  assert.deepEqual(
    ordenarLista(vs, "v", "desc", campos).map((x) => x.v),
    ["b", "a", null, ""]
  );
});

test("sem coluna, mantém a ordem que veio do banco", () => {
  const vs = [{ v: 3 }, { v: 1 }, { v: 2 }];
  assert.deepEqual(ordenarLista(vs, undefined, "asc", { v: (x) => x.v }), vs);
  // coluna que não existe também não bagunça
  assert.deepEqual(ordenarLista(vs, "outra", "asc", { v: (x) => x.v }), vs);
});

test("não altera o array original", () => {
  const vs = [{ v: 2 }, { v: 1 }];
  ordenarLista(vs, "v", "asc", { v: (x) => x.v });
  assert.deepEqual(vs.map((x) => x.v), [2, 1]);
});

test("compararValores: número antes de texto quando ambos numéricos", () => {
  assert.ok(compararValores(2, 10, "asc") < 0);
  assert.ok(compararValores("2", "10", "asc") < 0); // numeric: true
});

test("linkDaColuna: coluna nova começa crescente, ativa inverte", () => {
  assert.equal(
    linkDaColuna("/orcamentos", "cliente", undefined, undefined),
    "/orcamentos?ordem=cliente"
  );
  assert.equal(
    linkDaColuna("/orcamentos", "cliente", "cliente", "asc"),
    "/orcamentos?ordem=cliente&dir=desc"
  );
  // já invertida: volta para crescente
  assert.equal(
    linkDaColuna("/orcamentos", "cliente", "cliente", "desc"),
    "/orcamentos?ordem=cliente"
  );
});

test("linkDaColuna: preserva filtros e ignora os vazios", () => {
  const url = linkDaColuna("/atendimentos", "tempo", undefined, undefined, {
    q: "maria",
    fase: undefined,
    status: "",
  });
  assert.equal(url, "/atendimentos?q=maria&ordem=tempo");
});

test("linkDaColuna: par de parâmetros próprio para a segunda tabela", () => {
  const url = linkDaColuna(
    "/cadastros/clientes/7",
    "data",
    "data",
    "asc",
    { ordemA: "fase" },
    "ordemO",
    "dirO"
  );
  assert.equal(url, "/cadastros/clientes/7?ordemA=fase&ordemO=data&dirO=desc");
});
