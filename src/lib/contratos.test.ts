import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acoesPermitidas,
  calcularRetencao,
  compararComOrigem,
  dividirCentavos,
  gerarPreset,
  gerarPresetPercentual,
  lerSnapshot,
  letraOpcao,
  pendenciasParaEmitir,
  podeFazer,
  proximoNumeroAditivo,
  proximoNumeroContrato,
  validarPlanoPagamento,
  validarPlanoPercentual,
  type SnapshotContrato,
} from "./contratos";

const baseParaEmitir = {
  clienteNome: "Cliente",
  clienteDocumento: "123.456.789-00",
  clienteEndereco: "Rua Um, 1",
  localInstalacao: "Quintal",
  itens: [{}],
};

test("lerSnapshot: snapshot torto não derruba a tela do contrato", () => {
  assert.equal(lerSnapshot(null), null);
  assert.equal(lerSnapshot("isso não é json"), null);
  // formato antigo/parcial: sem orcamento, não dá para comparar
  assert.equal(lerSnapshot(JSON.stringify({ cliente: { nome: "X" } })), null);
  const bom = JSON.stringify({
    cliente: { nome: "X", documento: null, endereco: null, telefone: "1", email: null },
    orcamento: { numero: "2026-001", status: "aprovado", valorTotal: 1000 },
  });
  assert.equal(lerSnapshot(bom)?.orcamento.valorTotal, 1000);
});

test("letraOpcao: A, B, C pela ordem", () => {
  assert.equal(letraOpcao(0), "A");
  assert.equal(letraOpcao(1), "B");
  assert.equal(letraOpcao(2), "C");
});

test("validarPlanoPercentual: fecha em 100%", () => {
  assert.equal(
    validarPlanoPercentual([{ percentual: 50 }, { percentual: 50 }]).ok,
    true
  );
  // centavos de percentual também fecham
  assert.equal(
    validarPlanoPercentual([
      { percentual: 33.33 },
      { percentual: 33.33 },
      { percentual: 33.34 },
    ]).ok,
    true
  );
});

test("validarPlanoPercentual: acusa falta e sobra", () => {
  const falta = validarPlanoPercentual([{ percentual: 40 }]);
  assert.equal(falta.ok, false);
  assert.match(falta.mensagem ?? "", /faltam 60%/);
  const sobra = validarPlanoPercentual([{ percentual: 70 }, { percentual: 50 }]);
  assert.equal(sobra.ok, false);
  assert.match(sobra.mensagem ?? "", /passam de 100%/);
  assert.equal(validarPlanoPercentual([]).ok, false);
});

test("pendencias com opções: cobra percentual, não valor total", () => {
  // valorTotal zerado não é pendência quando há opções
  const faltas = pendenciasParaEmitir({
    ...baseParaEmitir,
    valorTotal: 0,
    opcoes: [
      { ordem: 0, rotulo: "16,20 × 3,00", valor: 4841000 },
      { ordem: 1, rotulo: "16,20 × 4,55", valor: 8960000 },
    ],
    pagamentos: [
      { valor: 0, percentual: 50 },
      { valor: 0, percentual: 50 },
    ],
  });
  assert.deepEqual(faltas, []);
});

test("pendencias com opções: uma opção só não vale", () => {
  const faltas = pendenciasParaEmitir({
    ...baseParaEmitir,
    valorTotal: 0,
    opcoes: [{ ordem: 0, rotulo: "única", valor: 1000 }],
    pagamentos: [{ valor: 0, percentual: 100 }],
  });
  assert.equal(faltas.length, 1);
  assert.match(faltas[0], /use o valor total fechado/);
});

test("pendencias com opções: opção sem rótulo ou sem valor é pendência", () => {
  const faltas = pendenciasParaEmitir({
    ...baseParaEmitir,
    valorTotal: 0,
    opcoes: [
      { ordem: 0, rotulo: "", valor: 4841000 },
      { ordem: 1, rotulo: "B", valor: 0 },
    ],
    pagamentos: [{ valor: 0, percentual: 100 }],
  });
  assert.match(faltas[0], /Opção A: falta a descrição/);
  assert.match(faltas[1], /Opção B: falta o valor/);
});

test("pendencias sem opções: continua cobrando o valor fechado", () => {
  const faltas = pendenciasParaEmitir({
    ...baseParaEmitir,
    valorTotal: 0,
    pagamentos: [{ valor: 0 }],
  });
  assert.match(faltas.join(" | "), /Valor total do contrato/);
});

test("gerarPresetPercentual: soma 100% e zera os valores", () => {
  const linhas = gerarPresetPercentual("entrada_saldo_entrega");
  assert.equal(validarPlanoPercentual(linhas).ok, true);
  assert.equal(
    linhas.every((l) => l.valor === 0),
    true
  );
});

test("gerarPresetPercentual: parcelado em 3 também fecha em 100%", () => {
  const linhas = gerarPresetPercentual("entrada_parcelas_mensais", {
    parcelas: 3,
  });
  assert.equal(validarPlanoPercentual(linhas).ok, true);
});

test("proximoNumeroContrato: primeiro do ano", () => {
  assert.equal(proximoNumeroContrato([], 2026), "CT-2026-0001");
});

test("proximoNumeroContrato: sequencial e isolado por ano", () => {
  const existentes = ["CT-2026-0001", "CT-2026-0002", "CT-2025-0099"];
  assert.equal(proximoNumeroContrato(existentes, 2026), "CT-2026-0003");
  assert.equal(proximoNumeroContrato(existentes, 2027), "CT-2027-0001");
});

test("proximoNumeroContrato: ignora nulos e formatos estranhos", () => {
  const existentes = [null, "CT-2026-0007", "rascunho", "CT-2026-abc"];
  assert.equal(proximoNumeroContrato(existentes, 2026), "CT-2026-0008");
});

test("proximoNumeroAditivo: sequencial por contrato", () => {
  assert.equal(proximoNumeroAditivo([]), 1);
  assert.equal(proximoNumeroAditivo([1, 2]), 3);
  assert.equal(proximoNumeroAditivo([3, 1, 2]), 4);
});

test("validarPlanoPagamento: soma exata passa", () => {
  const r = validarPlanoPagamento([{ valor: 100000 }, { valor: 99500 }], 199500);
  assert.equal(r.ok, true);
  assert.equal(r.diferenca, 0);
  assert.equal(r.mensagem, null);
});

test("validarPlanoPagamento: falta e sobra reportam a diferença", () => {
  const falta = validarPlanoPagamento([{ valor: 100000 }], 199500);
  assert.equal(falta.ok, false);
  assert.equal(falta.diferenca, -99500);
  assert.match(falta.mensagem ?? "", /não alcança/);

  const sobra = validarPlanoPagamento([{ valor: 300000 }], 199500);
  assert.equal(sobra.ok, false);
  assert.equal(sobra.diferenca, 100500);
  assert.match(sobra.mensagem ?? "", /passa do valor/);
});

test("validarPlanoPagamento: plano vazio nunca é válido", () => {
  const r = validarPlanoPagamento([], 199500);
  assert.equal(r.ok, false);
  assert.match(r.mensagem ?? "", /vazio/);
});

test("dividirCentavos: fecha o total sem perder centavo", () => {
  const partes = dividirCentavos(100000, 3);
  assert.equal(partes.length, 3);
  assert.equal(
    partes.reduce((s, v) => s + v, 0),
    100000
  );
  assert.deepEqual(partes, [33334, 33333, 33333]);
});

test("gerarPreset: todo preset fecha com o valor total", () => {
  const total = 1234567;
  for (const preset of [
    "a_vista",
    "entrada_saldo_entrega",
    "entrada_saldo_cartao",
    "parcelado_cartao",
    "entrada_parcelas_mensais",
  ] as const) {
    const linhas = gerarPreset(preset, total, { dataBase: "2026-01-31" });
    const v = validarPlanoPagamento(linhas, total);
    assert.equal(v.ok, true, `${preset} não fechou (dif ${v.diferenca})`);
  }
});

test("gerarPreset: entrada + parcelas mensais gera vencimentos mensais", () => {
  const linhas = gerarPreset("entrada_parcelas_mensais", 400000, {
    parcelas: 3,
    dataBase: "2026-01-31",
  });
  assert.equal(linhas.length, 4); // entrada + 3
  assert.equal(linhas[0].tipo, "sinal");
  // 31/01 + 1 mês cai no último dia de fevereiro (2026 não é bissexto)
  assert.deepEqual(
    linhas.slice(1).map((l) => l.dataVencimento),
    ["2026-02-28", "2026-03-31", "2026-04-30"]
  );
});

test("gerarPreset: personalizado começa vazio", () => {
  assert.deepEqual(gerarPreset("personalizado", 100000), []);
});

test("pendenciasParaEmitir: contrato completo não tem pendência", () => {
  const faltas = pendenciasParaEmitir({
    clienteNome: "Maria Silva",
    clienteDocumento: "123.456.789-00",
    clienteEndereco: "Rua A, 10 — BH",
    localInstalacao: "Área da piscina",
    valorTotal: 199500,
    itens: [{}],
    pagamentos: [{ valor: 199500 }],
  });
  assert.deepEqual(faltas, []);
});

test("pendenciasParaEmitir: CPF/CNPJ ausente bloqueia", () => {
  const faltas = pendenciasParaEmitir({
    clienteNome: "Maria Silva",
    clienteDocumento: null,
    clienteEndereco: "Rua A, 10",
    localInstalacao: "Varanda",
    valorTotal: 199500,
    itens: [{}],
    pagamentos: [{ valor: 199500 }],
  });
  assert.equal(faltas.length, 1);
  assert.match(faltas[0], /CPF\/CNPJ/);
});

test("pendenciasParaEmitir: plano que não bate entra na lista", () => {
  const faltas = pendenciasParaEmitir({
    clienteNome: "Maria",
    clienteDocumento: "123",
    clienteEndereco: "Rua A",
    localInstalacao: "Varanda",
    valorTotal: 199500,
    itens: [{}],
    pagamentos: [{ valor: 100000 }],
  });
  assert.equal(faltas.length, 1);
  assert.match(faltas[0], /Plano de pagamento/);
});

test("acoesPermitidas: assinado não edita nem versiona", () => {
  assert.deepEqual(acoesPermitidas("rascunho"), [
    "editar",
    "emitir",
    "cancelar",
  ]);
  assert.equal(podeFazer("assinado", "editar"), false);
  assert.equal(podeFazer("assinado", "versionar"), false);
  assert.equal(podeFazer("assinado", "aditivar"), true);
  assert.equal(podeFazer("emitido", "versionar"), true);
  assert.equal(podeFazer("emitido", "editar"), false);
  assert.deepEqual(acoesPermitidas("cancelado"), []);
});

test("calcularRetencao: percentual sobre o total", () => {
  assert.equal(calcularRetencao(199500, 30), 59850);
  assert.equal(calcularRetencao(100000, 0), 0);
});

const base: SnapshotContrato = {
  cliente: {
    nome: "Maria Silva",
    documento: "123.456.789-00",
    endereco: "Rua A, 10",
    telefone: "(31)99999-0000",
    email: null,
  },
  orcamento: { numero: "2026-001", status: "aprovado", valorTotal: 199500 },
};

test("compararComOrigem: sem snapshot não acusa divergência", () => {
  assert.deepEqual(compararComOrigem(null, base), []);
});

test("compararComOrigem: aponta o que mudou depois da emissão", () => {
  const atual: SnapshotContrato = {
    cliente: { ...base.cliente, endereco: "Rua B, 20" },
    orcamento: { ...base.orcamento, valorTotal: 250000 },
  };
  const divs = compararComOrigem(base, atual);
  assert.equal(divs.length, 2);
  assert.deepEqual(
    divs.map((d) => d.campo).sort(),
    ["Endereço", "Valor do orçamento"]
  );
});

test("compararComOrigem: iguais não geram ruído", () => {
  assert.deepEqual(compararComOrigem(base, { ...base }), []);
});
