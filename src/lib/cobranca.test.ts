import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diasDeAtraso,
  situacaoParcela,
  vencimentoEfetivo,
  type MarcosDoContrato,
  type ParcelaParaCobranca,
} from "./cobranca";

const HOJE = new Date(2026, 7, 27); // 27/08/2026
const dia = (mes: number, d: number) => new Date(2026, mes - 1, d);

const parcela = (p: Partial<ParcelaParaCobranca>): ParcelaParaCobranca => ({
  gatilho: "data_fixa",
  diasApos: null,
  dataVencimento: null,
  pagoEm: null,
  ...p,
});

const ASSINADO_EM_10_08: MarcosDoContrato = {
  dataAssinatura: dia(8, 10),
  dataEntrega: null,
};

const SEM_MARCOS: MarcosDoContrato = {
  dataAssinatura: null,
  dataEntrega: null,
};

test("data fixa vale por si, em Date ou em texto ISO", () => {
  assert.deepEqual(
    vencimentoEfetivo(parcela({ dataVencimento: dia(9, 5) }), SEM_MARCOS),
    dia(9, 5)
  );
  assert.deepEqual(
    vencimentoEfetivo(parcela({ dataVencimento: "2026-09-05" }), SEM_MARCOS),
    dia(9, 5)
  );
});

test("parcela na assinatura vence no dia da assinatura", () => {
  assert.deepEqual(
    vencimentoEfetivo(parcela({ gatilho: "assinatura" }), ASSINADO_EM_10_08),
    dia(8, 10)
  );
});

test("dias após a assinatura soma a partir da assinatura", () => {
  assert.deepEqual(
    vencimentoEfetivo(
      parcela({ gatilho: "dias_apos_assinatura", diasApos: 30 }),
      ASSINADO_EM_10_08
    ),
    dia(9, 9)
  );
});

test("dias após a instalação depende da entrega registrada", () => {
  const marcos = { dataAssinatura: dia(8, 1), dataEntrega: dia(8, 20) };
  assert.deepEqual(
    vencimentoEfetivo(
      parcela({ gatilho: "dias_apos_instalacao", diasApos: 10 }),
      marcos
    ),
    dia(8, 30)
  );
});

// É a regra que impede a régua de cobrar o cliente por algo que ainda não
// era para ter acontecido.
test("evento que ainda não aconteceu não gera vencimento", () => {
  assert.equal(
    vencimentoEfetivo(parcela({ gatilho: "assinatura" }), SEM_MARCOS),
    null
  );
  assert.equal(
    vencimentoEfetivo(
      parcela({ gatilho: "conclusao_instalacao" }),
      ASSINADO_EM_10_08
    ),
    null
  );
  assert.equal(
    vencimentoEfetivo(
      parcela({ gatilho: "dias_apos_instalacao", diasApos: 10 }),
      ASSINADO_EM_10_08
    ),
    null
  );
});

test("fabricação e entrega de material não têm data no sistema", () => {
  for (const g of ["inicio_fabricacao", "entrega_material"] as const) {
    assert.equal(
      vencimentoEfetivo(parcela({ gatilho: g, diasApos: 5 }), ASSINADO_EM_10_08),
      null
    );
  }
});

test("situação separa paga, vencida, a vencer e sem data", () => {
  assert.equal(
    situacaoParcela(
      parcela({ dataVencimento: dia(8, 1), pagoEm: dia(8, 2) }),
      SEM_MARCOS,
      HOJE
    ),
    "paga"
  );
  assert.equal(
    situacaoParcela(parcela({ dataVencimento: dia(8, 20) }), SEM_MARCOS, HOJE),
    "vencida"
  );
  assert.equal(
    situacaoParcela(parcela({ dataVencimento: dia(9, 20) }), SEM_MARCOS, HOJE),
    "a_vencer"
  );
  assert.equal(
    situacaoParcela(parcela({ gatilho: "assinatura" }), SEM_MARCOS, HOJE),
    "sem_data"
  );
});

test("vencer hoje ainda não é atraso", () => {
  assert.equal(
    situacaoParcela(parcela({ dataVencimento: HOJE }), SEM_MARCOS, HOJE),
    "a_vencer"
  );
  assert.equal(diasDeAtraso(parcela({ dataVencimento: HOJE }), SEM_MARCOS, HOJE), 0);
});

test("atraso conta em dias e zera quando a parcela é paga", () => {
  assert.equal(
    diasDeAtraso(parcela({ dataVencimento: dia(8, 20) }), SEM_MARCOS, HOJE),
    7
  );
  assert.equal(
    diasDeAtraso(
      parcela({ dataVencimento: dia(8, 20), pagoEm: dia(8, 25) }),
      SEM_MARCOS,
      HOJE
    ),
    0
  );
});
