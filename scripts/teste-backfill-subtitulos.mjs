// Teste do backfill de subtítulos, com os casos REAIS que existem em produção.
// Prova que a observação geral sobe para o topo e que separador de grupo,
// qualificador ("com calha") e nome de produto ficam onde estão.
//
// Uso: node scripts/teste-backfill-subtitulos.mjs   (precisa do Node 20)

import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { subirObservacoes, ehObservacaoGeral } from "./backfill-subtitulos.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sub-"));
const db = new Database(path.join(dir, "t.db"));
db.exec(`CREATE TABLE orcamento_itens (id INTEGER PRIMARY KEY AUTOINCREMENT,
  orcamento_id INTEGER NOT NULL, descricao TEXT NOT NULL,
  valor_min INTEGER, valor_max INTEGER, ordem INTEGER NOT NULL DEFAULT 0)`);

const ins = db.prepare("INSERT INTO orcamento_itens (orcamento_id, descricao, valor_min, ordem) VALUES (?,?,?,?)");
// casos REAIS de produção
const casos = {
  // DEVE subir — observação geral no fim (2026-027)
  31: [["Cobertura Termoacustica Forro",840000],["Cobertura Termoacustica Forro (prep. gesso)",1078000],["TOTAL",1918000],["orçamento referente à duas coberturas e desmontagem de cobertura de vidro",null]],
  // DEVE subir (2026-028)
  32: [["Manutenção Geral - Toldo Braço Articulado",250000],["orçamento referente à substituição de pino do redutor",null]],
  // NÃO pode subir — qualificador da linha de cima (2026-031)
  35: [["Cobertura em Tela de Sombreador",440000],["sem calha",null],["Cobertura em Tela de Sombreador",525000],["com calha",null]],
  // NÃO — separador de grupo no meio (2026-018)
  20: [["Escola/Jardim",null],["item",100000],["Refeitório",null],["item",200000]],
  // NÃO — nome do produto já no topo (2026-001)
  1: [["Telha Sanduíche",null],["item",890000]],
  // NÃO — TOTAL no fim COM valor (não é subtítulo) (2026-036)
  40: [["Toldo Cortina PVC",170000],["TOTAL",874000]],
};
for (const [oid, itens] of Object.entries(casos))
  itens.forEach(([d, v], i) => ins.run(Number(oid), d, v, i));

const antes = db.prepare("SELECT orcamento_id, descricao, ordem FROM orcamento_itens ORDER BY orcamento_id, ordem").all();
const movidos = subirObservacoes(db);

console.log("MOVIDOS:", movidos.map(m => `${m.orcamentoId}: ${m.descricao.slice(0,40)}`));

const primeiro = (oid) => db.prepare("SELECT descricao FROM orcamento_itens WHERE orcamento_id=? ORDER BY ordem LIMIT 1").get(oid).descricao;

// asserts
assert.match(primeiro(31), /referente à duas coberturas/, "31 deveria ter subido");
assert.match(primeiro(32), /referente à substituição/, "32 deveria ter subido");
assert.equal(primeiro(35), "Cobertura em Tela de Sombreador", "35 NÃO podia mudar");
assert.equal(primeiro(20), "Escola/Jardim", "20 NÃO podia mudar");
assert.equal(primeiro(1), "Telha Sanduíche", "1 NÃO podia mudar");
assert.equal(primeiro(40), "Toldo Cortina PVC", "40 NÃO podia mudar");
assert.equal(movidos.length, 2, "só 2 deviam mover");

// idempotência: rodar de novo não muda nada
const segunda = subirObservacoes(db);
assert.equal(segunda.length, 0, "segunda passada deve ser no-op");

// heurística
assert.equal(ehObservacaoGeral("com calha"), false);
assert.equal(ehObservacaoGeral("TOTAL"), false);
assert.equal(ehObservacaoGeral("medidas consideradas: 3,20 × 1,50"), true);
assert.equal(ehObservacaoGeral("valores referente à troca de lona"), true);

console.log("\n✅ backfill: move só observação geral no fim; idempotente");
db.close();
fs.rmSync(dir, { recursive: true, force: true });
