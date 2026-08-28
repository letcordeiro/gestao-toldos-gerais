import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agruparPorDia,
  conflitos,
  linkDaRota,
  paradasForaDaRota,
  type VisitaNaAgenda,
} from "./visitas";

const visita = (
  id: number,
  iso: string,
  extra: Partial<VisitaNaAgenda> = {}
): VisitaNaAgenda => ({
  id,
  inicioEm: new Date(iso),
  duracaoMin: 60,
  endereco: `Rua ${id}, 100 - Belo Horizonte`,
  situacao: "agendada",
  clienteNome: `Cliente ${id}`,
  ...extra,
});

test("agrupa por dia e ordena por horário dentro do dia", () => {
  const dias = agruparPorDia([
    visita(1, "2026-09-02T14:00:00"),
    visita(2, "2026-09-01T15:00:00"),
    visita(3, "2026-09-01T09:00:00"),
  ]);
  assert.deepEqual(
    dias.map((d) => d.chave),
    ["2026-09-01", "2026-09-02"]
  );
  assert.deepEqual(dias[0].visitas.map((v) => v.id), [3, 2]);
});

test("dia vira chave estável, sem depender de fuso", () => {
  const dias = agruparPorDia([
    visita(1, "2026-09-01T23:30:00"),
    visita(2, "2026-09-01T00:30:00"),
  ]);
  assert.equal(dias.length, 1);
  assert.equal(dias[0].chave, "2026-09-01");
});

// Duas visitas atropeladas é erro de agenda: quem chega depois é que precisa
// mudar, não a que já estava marcada.
test("conflito aponta a visita que começa antes da anterior acabar", () => {
  const ids = conflitos([
    visita(1, "2026-09-01T09:00:00", { duracaoMin: 90 }),
    visita(2, "2026-09-01T10:00:00"),
    visita(3, "2026-09-01T14:00:00"),
  ]);
  assert.deepEqual(ids, [2]);
});

test("visita cancelada não gera conflito", () => {
  const ids = conflitos([
    visita(1, "2026-09-01T09:00:00", { duracaoMin: 120, situacao: "cancelada" }),
    visita(2, "2026-09-01T10:00:00"),
  ]);
  assert.deepEqual(ids, []);
});

test("encostar não é conflito: 9h+60min e 10h convivem", () => {
  const ids = conflitos([
    visita(1, "2026-09-01T09:00:00", { duracaoMin: 60 }),
    visita(2, "2026-09-01T10:00:00"),
  ]);
  assert.deepEqual(ids, []);
});

test("rota sai na ordem dos horários, não otimizada", () => {
  const url = linkDaRota([
    visita(1, "2026-09-01T09:00:00", { endereco: "A" }),
    visita(2, "2026-09-01T11:00:00", { endereco: "B" }),
    visita(3, "2026-09-01T15:00:00", { endereco: "C" }),
  ]);
  assert.ok(url);
  const p = new URL(url).searchParams;
  assert.equal(p.get("origin"), "A");
  assert.equal(p.get("waypoints"), "B");
  assert.equal(p.get("destination"), "C");
});

test("com ponto de partida, todas as visitas viram parada", () => {
  const url = linkDaRota(
    [
      visita(1, "2026-09-01T09:00:00", { endereco: "A" }),
      visita(2, "2026-09-01T11:00:00", { endereco: "B" }),
    ],
    "Loja"
  );
  assert.ok(url);
  const p = new URL(url).searchParams;
  assert.equal(p.get("origin"), "Loja");
  assert.equal(p.get("waypoints"), "A");
  assert.equal(p.get("destination"), "B");
});

test("uma parada só não vira rota (a menos que haja partida)", () => {
  assert.equal(linkDaRota([visita(1, "2026-09-01T09:00:00")]), null);
  assert.ok(linkDaRota([visita(1, "2026-09-01T09:00:00")], "Loja"));
});

test("visita sem endereço e cancelada ficam fora da rota", () => {
  const url = linkDaRota([
    visita(1, "2026-09-01T09:00:00", { endereco: "A" }),
    visita(2, "2026-09-01T10:00:00", { endereco: null }),
    visita(3, "2026-09-01T11:00:00", { endereco: "C", situacao: "cancelada" }),
    visita(4, "2026-09-01T12:00:00", { endereco: "D" }),
  ]);
  assert.ok(url);
  const p = new URL(url).searchParams;
  assert.equal(p.get("origin"), "A");
  assert.equal(p.get("destination"), "D");
  assert.equal(p.get("waypoints"), null);
});

test("acima do limite do Maps, avisa quantas paradas ficaram de fora", () => {
  const doze = Array.from({ length: 12 }, (_, i) =>
    visita(i + 1, `2026-09-01T${String(8 + i).padStart(2, "0")}:00:00`, {
      endereco: `End ${i + 1}`,
    })
  );
  assert.equal(paradasForaDaRota(doze), 2);
  const url = linkDaRota(doze);
  assert.ok(url);
  const p = new URL(url).searchParams;
  assert.equal(p.get("destination"), "End 10");
});
