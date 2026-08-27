import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estaNaHora,
  lerBlocos,
  lerDestinatarios,
  separarDestinatarios,
} from "./resumo";

const AGORA = new Date(2026, 7, 27, 7, 0); // 27/08/2026, 7h
const horas = (n: number) => new Date(AGORA.getTime() - n * 60 * 60 * 1000);

test("resumo que nunca saiu está sempre na hora", () => {
  assert.equal(estaNaHora("diario", null, AGORA), true);
  assert.equal(estaNaHora("mensal", null, AGORA), true);
});

test("diário espera um dia", () => {
  assert.equal(estaNaHora("diario", horas(2), AGORA), false);
  assert.equal(estaNaHora("diario", horas(24), AGORA), true);
});

// O cron roda no mesmo horário todo dia; alguns segundos de diferença não
// podem fazer o resumo pular o dia inteiro.
test("margem de 2 horas cobre a variação do cron", () => {
  assert.equal(estaNaHora("diario", horas(23), AGORA), true);
  assert.equal(estaNaHora("diario", horas(21), AGORA), false);
});

test("semanal, quinzenal e mensal respeitam o próprio intervalo", () => {
  assert.equal(estaNaHora("semanal", horas(24 * 6), AGORA), false);
  assert.equal(estaNaHora("semanal", horas(24 * 7), AGORA), true);
  assert.equal(estaNaHora("quinzenal", horas(24 * 14), AGORA), false);
  assert.equal(estaNaHora("quinzenal", horas(24 * 15), AGORA), true);
  assert.equal(estaNaHora("mensal", horas(24 * 29), AGORA), false);
  assert.equal(estaNaHora("mensal", horas(24 * 30), AGORA), true);
});

test("blocos desconhecidos ou JSON quebrado não derrubam a leitura", () => {
  assert.deepEqual(lerBlocos('["tarefas_do_dia","inventado"]'), [
    "tarefas_do_dia",
  ]);
  assert.deepEqual(lerBlocos("não é json"), []);
  assert.deepEqual(lerBlocos('{"a":1}'), []);
});

test("destinatários inválidos são descartados e a lista para em 5", () => {
  const seis = JSON.stringify(
    Array.from({ length: 6 }, (_, i) => ({ email: `a${i}@x.com`, tipo: "para" }))
  );
  assert.equal(lerDestinatarios(seis).length, 5);
  assert.deepEqual(
    lerDestinatarios('[{"email":"a@x.com","tipo":"xis"},{"email":"b@x.com","tipo":"copia"}]'),
    [{ email: "b@x.com", tipo: "copia" }]
  );
});

test("separa para, cópia e cópia oculta", () => {
  const r = separarDestinatarios([
    { email: "a@x.com", tipo: "para" },
    { email: "b@x.com", tipo: "copia" },
    { email: "c@x.com", tipo: "oculta" },
    { email: "d@x.com", tipo: "para" },
  ]);
  assert.deepEqual(r.para, ["a@x.com", "d@x.com"]);
  assert.deepEqual(r.copia, ["b@x.com"]);
  assert.deepEqual(r.oculta, ["c@x.com"]);
});
