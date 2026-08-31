import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cabeNoLivre,
  horariosLivres,
  juntarIntervalos,
  textoDoIntervalo,
} from "./disponibilidade";

const DIA = new Date(2026, 8, 3); // quinta, 03/09/2026
const h = (hora: number, min = 0) => new Date(2026, 8, 3, hora, min, 0, 0);
const texto = (l: { inicio: Date; fim: Date }[]) => l.map(textoDoIntervalo);

test("dia sem compromisso é o expediente inteiro", () => {
  assert.deepEqual(texto(horariosLivres(DIA, [])), ["08:00 às 18:00"]);
});

test("um compromisso parte o dia em dois", () => {
  const livres = horariosLivres(DIA, [{ inicio: h(10), fim: h(11) }]);
  assert.deepEqual(texto(livres), ["08:00 às 10:00", "11:00 às 18:00"]);
});

test("compromissos sobrepostos não descontam o mesmo pedaço duas vezes", () => {
  const livres = horariosLivres(DIA, [
    { inicio: h(10), fim: h(12) },
    { inicio: h(11), fim: h(13) },
  ]);
  assert.deepEqual(texto(livres), ["08:00 às 10:00", "13:00 às 18:00"]);
});

test("compromissos que só se encostam viram um bloco só", () => {
  const juntos = juntarIntervalos([
    { inicio: h(9), fim: h(10) },
    { inicio: h(10), fim: h(11) },
  ]);
  assert.equal(juntos.length, 1);
  assert.deepEqual(texto(juntos), ["09:00 às 11:00"]);
});

test("folga menor que a visita não é oferecida", () => {
  // Sobram 30 min entre os dois compromissos; a visita é de 60.
  const livres = horariosLivres(
    DIA,
    [
      { inicio: h(8), fim: h(10) },
      { inicio: h(10, 30), fim: h(18) },
    ],
    60
  );
  assert.deepEqual(texto(livres), []);
});

test("a mesma folga serve para uma visita curta", () => {
  const livres = horariosLivres(
    DIA,
    [
      { inicio: h(8), fim: h(10) },
      { inicio: h(10, 30), fim: h(18) },
    ],
    30
  );
  assert.deepEqual(texto(livres), ["10:00 às 10:30"]);
});

test("compromisso que passa do expediente não estoura a janela", () => {
  const livres = horariosLivres(DIA, [{ inicio: h(17), fim: h(23) }]);
  assert.deepEqual(texto(livres), ["08:00 às 17:00"]);
});

test("compromisso fora do expediente não tira nada do dia", () => {
  const livres = horariosLivres(DIA, [{ inicio: h(6), fim: h(7) }]);
  assert.deepEqual(texto(livres), ["08:00 às 18:00"]);
});

test("no dia de hoje o passado não é oferecido, e arredonda o quarto de hora", () => {
  const livres = horariosLivres(DIA, [], 60, undefined, h(14, 7));
  assert.deepEqual(texto(livres), ["14:15 às 18:00"]);
});

test("depois do expediente não sobra nada hoje", () => {
  assert.deepEqual(horariosLivres(DIA, [], 60, undefined, h(19)), []);
});

test("intervalo invertido é ignorado em vez de virar lixo", () => {
  const livres = horariosLivres(DIA, [{ inicio: h(12), fim: h(11) }]);
  assert.deepEqual(texto(livres), ["08:00 às 18:00"]);
});

test("cabeNoLivre recusa o que atravessa o fim da folga", () => {
  const livres = horariosLivres(DIA, [{ inicio: h(10), fim: h(18) }]);
  assert.ok(cabeNoLivre(h(8, 30), 60, livres));
  assert.ok(!cabeNoLivre(h(9, 30), 60, livres)); // terminaria 10:30
  assert.ok(!cabeNoLivre(h(11), 60, livres)); // dentro do compromisso
});
