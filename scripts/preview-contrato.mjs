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
// Reproduz o contrato do Dayrell (editado à mão no Word) para conferir se o
// sistema consegue gerar o mesmo documento sem passar pelo Word.
sqlite.exec(`
INSERT INTO clientes (id, nome, telefone, email, endereco, numero, bairro, cidade, cep, documento)
  VALUES (1,'DAYRELL HOTEL E CONVENÇÕES LTDA','(31) 98226-7531 (Tatiana) · (31) 3248-1000 (Jaqueline)',
          'obras@dayrell.com.br · gerentegeral@dayrell.com.br',
          'Rua Espírito Santo','901','Centro','Belo Horizonte/MG','30160-033','17.218.983/0001-30');
INSERT INTO fases (id, nome, ordem, cor, libera_instalacao) VALUES (1,'Orçamento aprovado',5,'#16A34A',1);
INSERT INTO atendimentos (id, cliente_id, fase_id) VALUES (1,1,1);
INSERT INTO orcamentos (id, numero, atendimento_id, status) VALUES (1,'${ano}-001',1,'aprovado');
INSERT INTO orcamento_itens (orcamento_id, descricao, valor_min, ordem)
  VALUES (1,'Cobertura tipo pérgola em alumínio 16,20 × 3,00',4841000,0);
`);

const token = "exemplo";
const VALOR = 4841000; // R$ 48.410,00 (opção A)
const OBS = [
  "COBERTURA TIPO PÉRGOLA EM ALUMÍNIO",
  "Fornecimento e instalação de cobertura tipo pérgola, composta por estrutura em perfis de alumínio 50 x 50 mm, com terças distribuídas em espaçamentos aproximados de 1,05 m, acabamento anodizado na cor Bronze 1002.",
  "A estrutura contará com calha metálica estrutural, com acabamento em pintura sintética na cor Bronze, dimensionada para captação e direcionamento das águas pluviais.",
  "Será instalado pilar central estrutural, com sistema de condução de água embutido internamente no próprio pilar, direcionando o escoamento até a altura da viga onde a estrutura estará apoiada, proporcionando melhor acabamento estético e evitando tubulações aparentes.",
  "A cobertura será executada em policarbonato alveolar de 10 mm, na cor Ouro Refletivo, proporcionando proteção contra intempéries e boa luminosidade.",
].join("\n");

sqlite
  .prepare(
    `INSERT INTO contratos (id, cliente_id, orcamento_id, status, numero, data_emissao, valor_total, escopo,
                            local_instalacao, observacoes_tecnicas, prazo_dias_uteis, garantia_meses,
                            representante_contratante, public_token, criado_por, snapshot)
     VALUES (1,1,1,'emitido',?,unixepoch(),?,'fabricacao',
             'local indicado pelo cliente', ?, 30, 12, 'Tatiana', ?, 'exemplo', ?)`
  )
  .run(
    `CT-${ano}-0001`,
    VALOR,
    OBS,
    token,
    JSON.stringify({ cliente: { nome: "DAYRELL HOTEL E CONVENÇÕES LTDA" } })
  );
sqlite
  .prepare(
    `INSERT INTO contrato_itens (contrato_id, ordem, modelo, cor, medidas_m2, descricao_extra)
     VALUES (1,0,'Cobertura tipo pérgola em alumínio','Bronze 1002','16,20 × 3,00 m','policarbonato alveolar 10 mm Ouro Refletivo')`
  )
  .run();
sqlite
  .prepare(
    `INSERT INTO contrato_pagamentos (contrato_id, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho, dias_apos)
     VALUES (1,0,'Sinal/entrada','sinal',?,'pix',1,'assinatura',NULL)`
  )
  .run(VALOR / 2);
sqlite
  .prepare(
    `INSERT INTO contrato_pagamentos (contrato_id, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho, dias_apos)
     VALUES (1,1,'Saldo','saldo',?,'boleto',3,'dias_apos_assinatura',30)`
  )
  .run(VALOR / 2);

console.log("banco:", dbPath, "token:", token);
