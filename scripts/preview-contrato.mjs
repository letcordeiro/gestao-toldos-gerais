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
// Dados de exemplo: cliente fictício de propósito, para o contrato poder ser
// mostrado a alguém sem expor dado real de cliente.
sqlite.exec(`
INSERT INTO clientes (id, nome, telefone, email, endereco, numero, complemento, bairro, cidade, cep, documento)
  VALUES (1,'Cliente Exemplo','(31) 90000-0000','cliente@exemplo.com','Rua Exemplo','100','apto 302','Buritis','Belo Horizonte/MG','30575-100','000.000.000-00');
INSERT INTO fases (id, nome, ordem, cor, libera_instalacao) VALUES (1,'Orçamento aprovado',5,'#16A34A',1);
INSERT INTO atendimentos (id, cliente_id, fase_id) VALUES (1,1,1);
INSERT INTO orcamentos (id, numero, atendimento_id, status) VALUES (1,'${ano}-001',1,'aprovado');
INSERT INTO orcamento_itens (orcamento_id, descricao, valor_min, ordem)
  VALUES (1,'Toldo Retrátil Cortina 4,00 × 3,00 m',1280000,0);
`);

const token = "exemplo";
const VALOR = 1280000; // R$ 12.800,00
sqlite
  .prepare(
    `INSERT INTO contratos (id, cliente_id, orcamento_id, status, numero, data_emissao, valor_total, escopo,
                            local_instalacao, observacoes_tecnicas, prazo_dias_uteis, garantia_meses, public_token, criado_por, snapshot)
     VALUES (1,1,1,'emitido',?,unixepoch(),?,'fabricacao',
             'Área gourmet nos fundos da residência',
             'Estrutura em alumínio branco, lona acrílica cor bege. Acionamento motorizado com controle remoto.',
             25, 12, ?, 'exemplo', ?)`
  )
  .run(
    `CT-${ano}-0001`,
    VALOR,
    token,
    JSON.stringify({ cliente: { nome: "Cliente Exemplo" } })
  );
sqlite
  .prepare(
    `INSERT INTO contrato_itens (contrato_id, ordem, modelo, cor, medidas_m2, descricao_extra)
     VALUES (1,0,'Toldo Retrátil Cortina','bege','4,00 × 3,00 m','motorizado, com controle remoto')`
  )
  .run();
sqlite
  .prepare(
    `INSERT INTO contrato_itens (contrato_id, ordem, modelo, cor, medidas_m2, descricao_extra)
     VALUES (1,1,'Sombreador lateral','bege','1,20 × 3,00 m',NULL)`
  )
  .run();
sqlite
  .prepare(
    `INSERT INTO contrato_pagamentos (contrato_id, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho)
     VALUES (1,0,'Sinal/entrada','sinal',512000,'pix',1,'assinatura')`
  )
  .run();
sqlite
  .prepare(
    `INSERT INTO contrato_pagamentos (contrato_id, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho)
     VALUES (1,1,'Saldo','saldo',768000,'cartao_credito',3,'conclusao_instalacao')`
  )
  .run();

console.log("banco:", dbPath, "token:", token);
