import { test } from "node:test";
import assert from "node:assert/strict";
import { lerFreeBusy } from "./google-freebusy";

const resposta = (busy: unknown) => ({ calendars: { primary: { busy } } });

test("lê os períodos ocupados da agenda principal", () => {
  const r = lerFreeBusy(
    resposta([
      { start: "2026-09-03T13:00:00Z", end: "2026-09-03T14:00:00Z" },
      { start: "2026-09-03T18:00:00Z", end: "2026-09-03T19:30:00Z" },
    ])
  );
  assert.equal(r.length, 2);
  assert.equal(r[0].inicio.toISOString(), "2026-09-03T13:00:00.000Z");
  assert.equal(r[1].fim.toISOString(), "2026-09-03T19:30:00.000Z");
});

test("junta o ocupado de mais de uma agenda", () => {
  const r = lerFreeBusy({
    calendars: {
      primary: { busy: [{ start: "2026-09-03T13:00:00Z", end: "2026-09-03T14:00:00Z" }] },
      outra: { busy: [{ start: "2026-09-03T15:00:00Z", end: "2026-09-03T16:00:00Z" }] },
    },
  });
  assert.equal(r.length, 2);
});

test("período sem data não vira intervalo inválido", () => {
  const r = lerFreeBusy(
    resposta([
      { start: "2026-09-03T13:00:00Z" },
      { end: "2026-09-03T14:00:00Z" },
      { start: "nao-e-data", end: "2026-09-03T14:00:00Z" },
      { start: "2026-09-03T13:00:00Z", end: "2026-09-03T14:00:00Z" },
    ])
  );
  assert.equal(r.length, 1);
});

test("fim antes do início é descartado", () => {
  const r = lerFreeBusy(
    resposta([{ start: "2026-09-03T14:00:00Z", end: "2026-09-03T13:00:00Z" }])
  );
  assert.deepEqual(r, []);
});

test("resposta vazia, estranha ou com erro não quebra", () => {
  assert.deepEqual(lerFreeBusy({}), []);
  assert.deepEqual(lerFreeBusy(null), []);
  assert.deepEqual(lerFreeBusy("erro"), []);
  assert.deepEqual(lerFreeBusy({ calendars: { primary: {} } }), []);
  assert.deepEqual(lerFreeBusy({ calendars: { primary: { busy: "x" } } }), []);
  assert.deepEqual(
    lerFreeBusy({ calendars: { primary: { errors: [{ reason: "notFound" }] } } }),
    []
  );
});
