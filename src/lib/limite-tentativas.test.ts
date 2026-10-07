import { test } from "node:test";
import assert from "node:assert/strict";
import { LimiteTentativas, minutosRestantes } from "./limite-tentativas";

const MIN = 60_000;

test("bloqueia depois de N falhas e libera depois do tempo", () => {
  const l = new LimiteTentativas(3, 15 * MIN, 15 * MIN);
  const t0 = 1_000_000;
  l.falhou("a", t0);
  l.falhou("a", t0 + 1);
  assert.equal(l.bloqueado("a", t0 + 2), 0);
  l.falhou("a", t0 + 2);
  assert.ok(l.bloqueado("a", t0 + 3) > 0);
  assert.equal(minutosRestantes(l.bloqueado("a", t0 + 3)), 15);
  assert.equal(l.bloqueado("a", t0 + 2 + 15 * MIN), 0);
});

test("acertar zera a conta; chaves diferentes não se misturam", () => {
  const l = new LimiteTentativas(2, 15 * MIN, 15 * MIN);
  l.falhou("a", 0);
  l.acertou("a");
  l.falhou("a", 1);
  assert.equal(l.bloqueado("a", 2), 0);
  l.falhou("b", 0);
  l.falhou("b", 1);
  assert.ok(l.bloqueado("b", 2) > 0);
  assert.equal(l.bloqueado("a", 2), 0);
});

test("falhas espaçadas além da janela não somam", () => {
  const l = new LimiteTentativas(2, 10 * MIN, 15 * MIN);
  l.falhou("a", 0);
  l.falhou("a", 11 * MIN);
  assert.equal(l.bloqueado("a", 11 * MIN + 1), 0);
});
