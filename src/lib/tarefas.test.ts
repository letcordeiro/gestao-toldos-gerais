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

const HOJE = new Date(2026, 7, 27); // 27/08/2026
const dia = (n: number) => new Date(2026, 7, n);

test("gaveta separa atrasada, hoje, amanhã e próximas", () => {
  assert.equal(gavetaDaTarefa(dia(25), HOJE), "atrasada");
  assert.equal(gavetaDaTarefa(dia(27), HOJE), "hoje");
  assert.equal(gavetaDaTarefa(dia(28), HOJE), "amanha");
  assert.equal(gavetaDaTarefa(dia(30), HOJE), "proximas");
  assert.equal(gavetaDaTarefa(null, HOJE), "sem_data");
});

test("gaveta ignora a hora: hoje às 23h ainda é hoje", () => {
  const hojeTarde = new Date(2026, 7, 27, 23, 30);
  assert.equal(gavetaDaTarefa(hojeTarde, HOJE), "hoje");
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
  assert.equal(d.getHours(), 0);
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
