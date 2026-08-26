import { test } from "node:test";
import assert from "node:assert/strict";
import {
  avisoVersao,
  frasePagamento,
  moedaComExtenso,
  montarClausulas,
  ordinalClausula,
  qualificacaoPartes,
  type DadosContrato,
} from "./contrato-clausulas";
import type { LinhaPagamento } from "./contratos";
import { EMPRESA_CONTRATO } from "./empresa";

const linha = (over: Partial<LinhaPagamento> = {}): LinhaPagamento => ({
  ordem: 0,
  rotulo: "Sinal/entrada",
  tipo: "sinal",
  valor: 199500,
  meio: "pix",
  numeroParcelas: 1,
  gatilho: "assinatura",
  diasApos: null,
  dataVencimento: null,
  ...over,
});

const dados = (over: Partial<DadosContrato> = {}): DadosContrato => ({
  numero: "CT-2026-0001",
  versao: 1,
  status: "emitido",
  escopo: "fabricacao",
  localInstalacao: "Área da piscina",
  observacoesTecnicas: null,
  valorTotal: 399000,
  prazoDiasUteis: 30,
  garantiaMeses: 12,
  retencaoPercent: 30,
  multaPercent: 2,
  jurosMesPercent: 1,
  flagMedidas: true,
  flagClima: true,
  flagEnergia: true,
  flagSobMedida: true,
  representante: "João Pedro Avelar",
  cidadeEmissao: "Belo Horizonte",
  dataEmissaoExtenso: "4 de agosto de 2026",
  contratante: {
    nome: "Maria Silva",
    documento: "123.456.789-00",
    endereco: "Rua A, 10 — Buritis — Belo Horizonte/MG",
    telefone: "(31)99999-0000",
    email: "maria@exemplo.com",
  },
  itens: [{ modelo: "Toldo Retrátil Cortina", cor: "bege", medidasM2: "3,00 × 2,50", descricaoExtra: null }],
  pagamentos: [
    linha(),
    linha({ ordem: 1, rotulo: "Saldo", tipo: "saldo", valor: 199500, gatilho: "conclusao_instalacao" }),
  ],
  ...over,
});

test("moedaComExtenso: número + extenso entre parênteses", () => {
  assert.equal(
    moedaComExtenso(199500),
    "R$ 1.995,00 (mil novecentos e noventa e cinco reais)"
  );
});

test("frasePagamento: sinal no ato da assinatura", () => {
  assert.equal(
    frasePagamento(linha()),
    "Sinal/entrada: R$ 1.995,00 (mil novecentos e noventa e cinco reais), por meio de PIX, no ato da assinatura deste instrumento."
  );
});

test("frasePagamento: saldo parcelado no cartão", () => {
  const f = frasePagamento(
    linha({
      rotulo: "Saldo",
      tipo: "saldo",
      numeroParcelas: 6,
      meio: "cartao_credito",
      gatilho: "conclusao_instalacao",
    })
  );
  assert.match(f, /em 6x no cartão de crédito/);
  assert.match(f, /na conclusão da instalação\.$/);
});

test("frasePagamento: data fixa mostra vencimento em dd/mm/aaaa", () => {
  const f = frasePagamento(
    linha({ gatilho: "data_fixa", dataVencimento: "2026-02-28" })
  );
  assert.match(f, /com vencimento em 28\/02\/2026/);
});

test("montarClausulas: 10 cláusulas com todas as flags ligadas", () => {
  const c = montarClausulas(dados());
  assert.equal(c.length, 10);
  assert.equal(c[0].titulo, "DO OBJETO");
  assert.equal(c[9].titulo, "DO FORO");
});

test("montarClausulas: renumeração é posicional (flags só mudam o conteúdo)", () => {
  // Desligar flags não remove cláusula inteira, mas remove os itens delas.
  const semClima = montarClausulas(dados({ flagClima: false, flagMedidas: false }));
  const prazo = semClima[2];
  assert.equal(prazo.titulo, "DO PRAZO DE ENTREGA E EXECUÇÃO");
  assert.equal(prazo.itens, undefined);
  // A numeração continua contígua: índice 0..9 → PRIMEIRA..DÉCIMA
  assert.equal(ordinalClausula(0), "PRIMEIRA");
  assert.equal(ordinalClausula(9), "DÉCIMA");
});

test("montarClausulas: flagSobMedida controla o parágrafo único do objeto", () => {
  assert.match(
    montarClausulas(dados()).at(0)!.paragrafoUnico ?? "",
    /sob medida/
  );
  assert.equal(montarClausulas(dados({ flagSobMedida: false }))[0].paragrafoUnico, undefined);
});

test("montarClausulas: flagEnergia controla o item de energia", () => {
  const com = montarClausulas(dados())[4].itens ?? [];
  const sem = montarClausulas(dados({ flagEnergia: false }))[4].itens ?? [];
  assert.equal(com.length - sem.length, 1);
  assert.ok(com.some((i) => /energia elétrica/.test(i)));
  assert.ok(!sem.some((i) => /energia elétrica/.test(i)));
});

test("valor cobre materiais E mão de obra (erro do modelo antigo)", () => {
  const c = montarClausulas(dados());
  const texto = c[1].paragrafos.join(" ");
  assert.match(texto, /fornecimento dos materiais e a mão de obra de instalação/);
  assert.ok(!/referente ao fornecimento de mão de obra/.test(texto));
});

test("nada de menção a remoção quando o escopo não é de remoção", () => {
  const texto = JSON.stringify(montarClausulas(dados({ escopo: "fabricacao" })));
  assert.ok(!/remo[çc]/i.test(texto));
  const comRemocao = JSON.stringify(
    montarClausulas(dados({ escopo: "remocao_fabricacao" }))
  );
  assert.match(comRemocao, /Remoção, fabricação e instalação/i);
});

test("'sinal' só aparece quando existe linha de sinal menor que o total", () => {
  const comSinal = montarClausulas(dados());
  assert.match(comSinal[1].paragrafoUnico ?? "", /sinal/);

  const aVista = montarClausulas(
    dados({
      pagamentos: [
        linha({ rotulo: "Pagamento à vista", tipo: "saldo", valor: 399000 }),
      ],
    })
  );
  assert.equal(aVista[1].paragrafoUnico, undefined);

  // sinal que cobre 100% do valor também não é sinal de verdade
  const sinalCheio = montarClausulas(
    dados({ pagamentos: [linha({ valor: 399000 })] })
  );
  assert.equal(sinalCheio[1].paragrafoUnico, undefined);
});

test("qualificacaoPartes: CPF/CNPJ do contratante entra no texto", () => {
  const q = qualificacaoPartes(dados(), {
    razaoSocial: "Toldos Gerais Ltda",
    cnpj: "02.873.343/0001-96",
    endereco: "Rua Carmelita Prates da Silva, 501",
  });
  assert.match(q.contratada, /CNPJ sob o nº 02\.873\.343\/0001-96/);
  assert.match(q.contratada, /João Pedro Avelar/);
  assert.match(q.contratante, /CPF sob o nº 123\.456\.789-00/);
});

test("qualificacaoPartes: emitente do contrato (Alvorada) entra completo", () => {
  const q = qualificacaoPartes(dados(), {
    razaoSocial: EMPRESA_CONTRATO.razaoSocial,
    nomeFantasia: EMPRESA_CONTRATO.nomeFantasia,
    cnpj: EMPRESA_CONTRATO.cnpj,
    inscricaoEstadual: EMPRESA_CONTRATO.inscricaoEstadual,
    endereco: EMPRESA_CONTRATO.endereco,
    regimeTributario: EMPRESA_CONTRATO.regimeTributario,
  });
  assert.match(q.contratada, /^Comercial Mari Ltda, nome fantasia Distribuidora Alvorada,/);
  assert.match(q.contratada, /CNPJ sob o nº 41\.415\.580\/0001-65/);
  assert.match(q.contratada, /Inscrição Estadual sob o nº 0040120360063/);
  assert.match(q.contratada, /Rua Estoril, 1724/);
  assert.match(q.contratada, /, empresa optante pelo Simples Nacional, neste ato representada/);
  // nada de Toldos Gerais sobrando no contrato
  assert.equal(/Toldos Gerais/.test(q.contratada), false);
});

test("qualificacaoPartes: campos opcionais ausentes não deixam sobra no texto", () => {
  const q = qualificacaoPartes(dados(), {
    razaoSocial: "Empresa Simples Ltda",
    cnpj: "00.000.000/0001-00",
    endereco: "Rua Um, 1",
  });
  assert.equal(/nome fantasia/.test(q.contratada), false);
  assert.equal(/Inscrição Estadual/.test(q.contratada), false);
  assert.match(q.contratada, /Rua Um, 1, neste ato representada/);
});

test("qualificacaoPartes: contratante com CNPJ é qualificado como empresa", () => {
  const q = qualificacaoPartes(
    dados({
      contratante: {
        nome: "DAYRELL HOTEL E CONVENÇÕES LTDA",
        documento: "17.218.983/0001-30",
        endereco: "Rua Espírito Santo, 901 – Centro – Belo Horizonte/MG",
        telefone: "(31) 3248-1000",
        email: "obras@dayrell.com.br",
        representante: "Tatiana Oliveira",
      },
    }),
    { razaoSocial: "X", cnpj: "0", endereco: "Y" }
  );
  assert.match(q.contratante, /pessoa jurídica de direito privado/);
  assert.match(q.contratante, /CNPJ sob o nº 17\.218\.983\/0001-30/);
  assert.match(q.contratante, /com sede em Rua Espírito Santo/);
  assert.match(q.contratante, /neste ato representada por Tatiana Oliveira/);
  assert.match(q.contratante, /denominada CONTRATANTE\.$/);
  // empresa não é "residente e domiciliada"
  assert.equal(/residente e domiciliad/.test(q.contratante), false);
});

test("qualificacaoPartes: empresa sem representante deixa linha para preencher", () => {
  const q = qualificacaoPartes(
    dados({
      contratante: {
        nome: "Empresa X Ltda",
        documento: "17218983000130",
        endereco: "Rua Um, 1",
        telefone: "(31) 3000-0000",
        email: null,
      },
    }),
    { razaoSocial: "X", cnpj: "0", endereco: "Y" }
  );
  assert.match(q.contratante, /neste ato representada por ____________________/);
});

test("observações técnicas com várias linhas viram parágrafos", () => {
  const c = montarClausulas(
    dados({
      observacoesTecnicas:
        "COBERTURA TIPO PÉRGOLA EM ALUMÍNIO\n\nEstrutura em perfis 50 x 50 mm.\nCalha metálica estrutural.",
    })
  );
  const p = c[0].paragrafos;
  assert.equal(p[1], "Observações técnicas:");
  assert.equal(p[2], "COBERTURA TIPO PÉRGOLA EM ALUMÍNIO");
  assert.equal(p[3], "Estrutura em perfis 50 x 50 mm.");
  assert.equal(p[4], "Calha metálica estrutural.");
});

test("observação técnica de uma linha só continua inline", () => {
  const c = montarClausulas(dados({ observacoesTecnicas: "Lona bege." }));
  assert.equal(c[0].paragrafos[1], "Observações técnicas: Lona bege.");
});

test("frasePagamento: parcelas por prazo listam os vencimentos", () => {
  const f = frasePagamento(
    linha({
      rotulo: "Saldo",
      tipo: "saldo",
      valor: 8960000,
      meio: "boleto",
      numeroParcelas: 3,
      gatilho: "dias_apos_assinatura",
      diasApos: 30,
    })
  );
  assert.match(f, /em 3x no boleto bancário/);
  assert.match(
    f,
    /com vencimentos em 30, 60 e 90 dias contados da assinatura deste instrumento/
  );
});

test("frasePagamento: parcela única por prazo continua no singular", () => {
  const f = frasePagamento(
    linha({ numeroParcelas: 1, gatilho: "dias_apos_assinatura", diasApos: 30 })
  );
  assert.match(f, /em até 30 \(trinta\) dias da assinatura deste instrumento/);
  assert.equal(/vencimentos em/.test(f), false);
});

test("avisoVersao: só a partir da versão 2", () => {
  assert.equal(avisoVersao(1), null);
  assert.match(avisoVersao(2) ?? "", /substitui e cancela a versão anterior/);
});

test("parametrização entra no texto (multa, juros, garantia, retenção)", () => {
  const c = montarClausulas(
    dados({ multaPercent: 2.5, jurosMesPercent: 1, garantiaMeses: 24, retencaoPercent: 40 })
  );
  assert.match(c[5].paragrafos[0], /multa de 2,5%/);
  assert.match(c[5].paragrafos[0], /juros de mora de 1% ao mês/);
  assert.match(c[6].paragrafos[0], /40% \(quarenta por cento\)/);
  assert.match(c[7].paragrafos[0], /24 \(vinte e quatro\) meses/);
});
