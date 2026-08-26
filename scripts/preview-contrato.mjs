// Uso interno (não vai para produção): monta um banco novo com um contrato
// emitido, para conferir o PDF do contrato de ponta a ponta.
//   node scripts/preview-contrato.mjs  ->  data/preview.db + token
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";

const dbPath = "data/preview.db";
fs.rmSync(dbPath, { force: true });
fs.rmSync(dbPath + "-wal", { force: true });
fs.rmSync(dbPath + "-shm", { force: true });
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");

const journal = JSON.parse(
  fs.readFileSync(path.join("drizzle", "meta", "_journal.json"), "utf8")
);
for (const e of journal.entries) {
  const sql = fs.readFileSync(path.join("drizzle", `${e.tag}.sql`), "utf8");
  for (const stmt of sql.split("--> statement-breakpoint")) {
    const s = stmt.trim();
    if (s) sqlite.exec(s);
  }
}

const ano = new Date().getFullYear();
sqlite.exec(`
INSERT INTO clientes (id, nome, telefone, email, endereco, numero, bairro, cidade, cep, documento)
  VALUES (1,'Maria Silva','(31)99999-0000','maria@exemplo.com','Rua A','10','Buritis','Belo Horizonte/MG','30575-100','123.456.789-00');
INSERT INTO fases (id, nome, ordem, cor, libera_instalacao) VALUES (1,'Orçamento aprovado',5,'#16A34A',1);
INSERT INTO atendimentos (id, cliente_id, fase_id) VALUES (1,1,1);
INSERT INTO orcamentos (id, numero, atendimento_id, status) VALUES (1,'${ano}-001',1,'aprovado');
INSERT INTO orcamento_itens (orcamento_id, descricao, valor_min, ordem)
  VALUES (1,'Toldo Retrátil Cortina 3,00 × 2,50',399000,0);
`);

const token = "preview1";
const VALOR = 399000;
sqlite
  .prepare(
    `INSERT INTO contratos (id, cliente_id, orcamento_id, status, numero, data_emissao, valor_total, local_instalacao, public_token, criado_por, snapshot)
     VALUES (1,1,1,'emitido',?,unixepoch(),?,'Área da piscina',?, 'preview', ?)`
  )
  .run(
    `CT-${ano}-0001`,
    VALOR,
    token,
    JSON.stringify({ cliente: { nome: "Maria Silva" } })
  );
sqlite
  .prepare(
    `INSERT INTO contrato_itens (contrato_id, ordem, modelo, cor, medidas_m2)
     VALUES (1,0,'Toldo Retrátil Cortina','bege','3,00 × 2,50 m')`
  )
  .run();
sqlite
  .prepare(
    `INSERT INTO contrato_pagamentos (contrato_id, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho)
     VALUES (1,0,'Sinal/entrada','sinal',?,'pix',1,'assinatura')`
  )
  .run(VALOR / 2);
sqlite
  .prepare(
    `INSERT INTO contrato_pagamentos (contrato_id, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho)
     VALUES (1,1,'Saldo','saldo',?,'cartao_credito',6,'conclusao_instalacao')`
  )
  .run(VALOR / 2);

console.log("banco:", dbPath, "token:", token);
