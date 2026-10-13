import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bloqueioEncerrado,
  descreverBloqueio,
  diasDaSemana,
  hojeISO,
  segundaDaSemana,
  diaDaSemana,
  intervalosDoDia,
  minutosDe,
  validarBloqueio,
  valeNoDia,
  type Bloqueio,
} from "./agenda";

const base: Bloqueio = {
  id: 1,
  vendedorId: 2,
  recorrencia: "semanal",
  data: null,
  diaSemana: 2, // terça
  inicioMin: 19 * 60,
  fimMin: 22 * 60,
  ate: null,
  motivo: "Faculdade",
};

test("dia da semana sai do calendário, sem fuso", () => {
  assert.equal(diaDaSemana("2026-10-13"), 2); // terça
  assert.equal(diaDaSemana("2026-10-18"), 0); // domingo
});

test("semanal vale toda terça, respeitando início e fim da vigência", () => {
  assert.ok(valeNoDia(base, "2026-10-13"));
  assert.ok(valeNoDia(base, "2026-10-20"));
  assert.ok(!valeNoDia(base, "2026-10-14")); // quarta
  const comVigencia = { ...base, data: "2026-10-20", ate: "2026-12-15" };
  assert.ok(!valeNoDia(comVigencia, "2026-10-13")); // antes de começar
  assert.ok(valeNoDia(comVigencia, "2026-12-15")); // último dia ainda vale
  assert.ok(!valeNoDia(comVigencia, "2026-12-22")); // depois do fim
});

test("único vale só no dia dele", () => {
  const unico: Bloqueio = { ...base, recorrencia: "unico", data: "2026-10-15", diaSemana: null };
  assert.ok(valeNoDia(unico, "2026-10-15"));
  assert.ok(!valeNoDia(unico, "2026-10-22"));
});

test("vira intervalo no mesmo relógio da agenda", () => {
  const [i] = intervalosDoDia([base], "2026-10-13");
  assert.equal(i.inicio.getHours(), 19);
  assert.equal(i.fim.getHours(), 22);
  assert.equal(i.inicio.getDate(), 13);
  assert.deepEqual(intervalosDoDia([base], "2026-10-14"), []);
});

test("texto que aparece na tela", () => {
  assert.equal(descreverBloqueio(base), "Toda terça, 19:00 às 22:00");
  assert.equal(
    descreverBloqueio({ ...base, recorrencia: "unico", data: "2026-10-15", inicioMin: 0, fimMin: 1440 }),
    "15/10/2026, dia inteiro"
  );
  assert.equal(descreverBloqueio({ ...base, diaSemana: 6 }), "Todo sábado, 19:00 às 22:00");
});

test("validação barra horário invertido e data faltando", () => {
  assert.equal(validarBloqueio({ ...base }), null);
  assert.match(validarBloqueio({ ...base, inicioMin: 600, fimMin: 600 }) ?? "", /depois do início/);
  assert.match(validarBloqueio({ ...base, recorrencia: "unico", data: null }) ?? "", /Escolha o dia/);
  assert.match(validarBloqueio({ ...base, data: "2026-12-01", ate: "2026-11-01" }) ?? "", /antes do início/);
  assert.equal(minutosDe("19:30"), 1170);
  assert.equal(minutosDe("24:00"), 1440);
  assert.equal(minutosDe("25:00"), null);
});

test("bloqueio que já passou sai da lista", () => {
  assert.ok(bloqueioEncerrado({ ...base, recorrencia: "unico", data: "2026-10-01" }, "2026-10-13"));
  assert.ok(!bloqueioEncerrado(base, "2026-10-13"));
  assert.ok(bloqueioEncerrado({ ...base, ate: "2026-10-01" }, "2026-10-13"));
});

test("semana começa na segunda e atravessa o mês", () => {
  assert.equal(segundaDaSemana("2026-10-13"), "2026-10-12"); // terça → segunda
  assert.equal(segundaDaSemana("2026-10-18"), "2026-10-12"); // domingo → segunda anterior
  assert.equal(segundaDaSemana("2026-10-12"), "2026-10-12");
  const dias = diasDaSemana("2026-10-26");
  assert.equal(dias.length, 7);
  assert.equal(dias[6], "2026-11-01");
});

test("hoje é o dia de Brasília, não o do servidor em UTC", () => {
  // 13/10 às 23h30 em BH = 14/10 02:30 UTC
  assert.equal(hojeISO(new Date("2026-10-14T02:30:00Z")), "2026-10-13");
});
