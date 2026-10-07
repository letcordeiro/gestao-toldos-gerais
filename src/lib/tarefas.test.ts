import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dataDoPrazo,
  gavetaDaTarefa,
  paraInputDate,
  parseDataBR,
  textoPrazo,
} from "./tarefas";
import { gerarPreset } from "./contratos";

// "Hoje" é um INSTANTE (lido no calendário de Brasília); prazo é data sem hora
// gravada como meia-noite UTC.
const HOJE = new Date("2026-08-27T12:00:00-03:00"); // 27/08/2026, meio-dia em BH
const dia = (n: number) => new Date(Date.UTC(2026, 7, n));

test("gaveta separa atrasada, hoje, amanhã e próximas", () => {
  assert.equal(gavetaDaTarefa(dia(25), HOJE), "atrasada");
  assert.equal(gavetaDaTarefa(dia(27), HOJE), "hoje");
  assert.equal(gavetaDaTarefa(dia(28), HOJE), "amanha");
  assert.equal(gavetaDaTarefa(dia(30), HOJE), "proximas");
  assert.equal(gavetaDaTarefa(null, HOJE), "sem_data");
});

test("às 23h em Brasília ainda é hoje (o servidor em UTC já estaria no dia seguinte)", () => {
  const noiteEmBH = new Date("2026-08-27T23:30:00-03:00"); // 02:30 UTC do dia 28
  assert.equal(gavetaDaTarefa(dia(27), noiteEmBH), "hoje");
  assert.equal(textoPrazo(dia(28), noiteEmBH), "amanhã");
  assert.equal(paraInputDate(dataDoPrazo(3, noiteEmBH)), "2026-08-30");
});

test("data digitada volta igual para o campo (editar não tira um dia)", () => {
  assert.equal(paraInputDate(parseDataBR("2026-10-07")), "2026-10-07");
  assert.equal(parseDataBR("2026-10-07")?.toISOString(), "2026-10-07T00:00:00.000Z");
});

test("texto do prazo fala como gente", () => {
  assert.equal(textoPrazo(dia(27), HOJE), "hoje");
  assert.equal(textoPrazo(dia(28), HOJE), "amanhã");
  assert.equal(textoPrazo(dia(26), HOJE), "ontem");
  assert.equal(textoPrazo(dia(20), HOJE), "há 7 dias");
  assert.equal(textoPrazo(dia(30), HOJE), "em 3 dias");
  assert.equal(textoPrazo(null, HOJE), "sem data");
});

test("prazo em dias cai no início do dia", () => {
  const d = dataDoPrazo(3, HOJE);
  assert.equal(paraInputDate(d), "2026-08-30");
  assert.equal(d.getUTCHours(), 0);
});

test("data aceita dd/mm/aaaa e aaaa-mm-dd", () => {
  assert.equal(paraInputDate(parseDataBR("05/09/2026")), "2026-09-05");
  assert.equal(paraInputDate(parseDataBR("2026-09-05")), "2026-09-05");
  assert.equal(parseDataBR(""), null);
  assert.equal(parseDataBR("qualquer coisa"), null);
});

// O gerador copiado do GestãoClick: N parcelas a cada X dias, com data fixa.
test("preset de intervalo divide o total e espaça os vencimentos", () => {
  const linhas = gerarPreset("intervalo_dias", 300_00, {
    parcelas: 3,
    intervaloDias: 30,
    dataBase: "2026-09-10",
    meio: "boleto",
  });
  assert.equal(linhas.length, 3);
  assert.equal(
    linhas.reduce((s, l) => s + l.valor, 0),
    300_00
  );
  assert.deepEqual(
    linhas.map((l) => l.dataVencimento),
    ["2026-09-10", "2026-10-10", "2026-11-09"]
  );
  assert.ok(linhas.every((l) => l.meio === "boleto"));
  assert.ok(linhas.every((l) => l.gatilho === "data_fixa"));
});

test("preset de intervalo com uma parcela vira pagamento único", () => {
  const linhas = gerarPreset("intervalo_dias", 1_000_00, {
    parcelas: 1,
    dataBase: "2026-09-10",
  });
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].rotulo, "Pagamento");
  assert.equal(linhas[0].valor, 1_000_00);
});

test("preset de intervalo fecha a soma mesmo com centavos quebrados", () => {
  const linhas = gerarPreset("intervalo_dias", 100_01, { parcelas: 3 });
  assert.equal(
    linhas.reduce((s, l) => s + l.valor, 0),
    100_01
  );
});
