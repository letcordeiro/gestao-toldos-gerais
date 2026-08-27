import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PADRAO,
  exemplo,
  formatarNumero,
  prefixoCompleto,
  proximoNumero,
} from "./numeracao";

test("formatos históricos da Toldos continuam iguais", () => {
  assert.equal(formatarNumero(PADRAO.orcamento, 7, 2026), "2026-007");
  assert.equal(formatarNumero(PADRAO.contrato, 7, 2026), "CT-2026-0007");
});

test("prefixo e ano são opcionais", () => {
  assert.equal(
    formatarNumero({ prefixo: "", incluiAno: false, digitos: 4 }, 12, 2026),
    "0012"
  );
  assert.equal(
    formatarNumero({ prefixo: "ORC", incluiAno: false, digitos: 3 }, 12, 2026),
    "ORC-012"
  );
  assert.equal(prefixoCompleto({ prefixo: "", incluiAno: false, digitos: 3 }, 2026), "");
});

test("sequencial sai do maior número existente", () => {
  const numeros = ["2026-001", "2026-004", "2026-002"];
  assert.equal(proximoNumero(numeros, PADRAO.orcamento, 2026), "2026-005");
});

test("número de outro ano não interfere", () => {
  const numeros = ["2025-099", "2026-002"];
  assert.equal(proximoNumero(numeros, PADRAO.orcamento, 2026), "2026-003");
});

test("primeiro do ano começa em 1", () => {
  assert.equal(proximoNumero(["2025-099"], PADRAO.orcamento, 2026), "2026-001");
  assert.equal(proximoNumero([], PADRAO.orcamento, 2026), "2026-001");
});

// Mudar o formato no meio do ano começa uma contagem nova — e o documento
// antigo continua com o número que já saiu no papel.
test("trocar o prefixo recomeça a sequência", () => {
  const numeros = ["2026-001", "2026-002"];
  const novo = { prefixo: "ORC", incluiAno: true, digitos: 3 };
  assert.equal(proximoNumero(numeros, novo, 2026), "ORC-2026-001");
});

test("número com lixo no lugar do sequencial é ignorado", () => {
  const numeros = ["2026-001", "2026-abc", null, "2026-003"];
  assert.equal(proximoNumero(numeros, PADRAO.orcamento, 2026), "2026-004");
});

test("dígitos fora da faixa são contidos, não quebram", () => {
  assert.equal(
    formatarNumero({ prefixo: "", incluiAno: false, digitos: 0 }, 5, 2026),
    "5"
  );
  assert.equal(
    formatarNumero({ prefixo: "", incluiAno: false, digitos: 99 }, 5, 2026).length,
    10
  );
});

test("o exemplo da tela mostra o primeiro número", () => {
  assert.equal(exemplo(PADRAO.contrato, 2026), "CT-2026-0001");
});
