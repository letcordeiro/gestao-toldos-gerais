// Uso interno (não vai para produção): monta um banco novo só para conferir a
// Ordem de Manutenção impressa. Roda TODAS as migrations do zero, então também
// serve de prova de que a migration nova aplica em banco limpo.
//   node scripts/preview-ordem-manutencao.mjs  ->  data/preview-ordem.db
//   DATABASE_PATH=./data/preview-ordem.db npm run dev
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = "data/preview-ordem.db";
for (const sufixo of ["", "-wal", "-shm"]) {
  fs.rmSync(dbPath + sufixo, { force: true });
}
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
console.log("migrations aplicadas:", journal.entries.length);

const dia = 86400;
const agora = Math.floor(Date.now() / 1000);
const ano = new Date().getFullYear();

sqlite.exec(`
INSERT INTO fases (id,nome,ordem,cor,libera_instalacao,terminal)
  VALUES (8,'Concluído',8,'#004E36',1,1);

-- whatsapp preenchido: sem ele o login cai em /perfil antes de chegar na tela.
INSERT INTO vendedores (id,nome,telefone,whatsapp,email,papel,ativo)
  VALUES (1,'Leticia Cordeiro','(31) 99614-6810','(31) 99614-6810','leticia@toldosgerais.com.br','gestor',1),
         (2,'João Avelar','(31) 98000-0002','(31) 98000-0002','joao@toldosgerais.com.br','vendedor',1);

-- Cliente com endereço completo: é o caso em que a linha "End." mais aperta.
INSERT INTO clientes (id,nome,telefone,endereco,numero,complemento,bairro,cidade,cep,ativo)
  VALUES (1,'Maria Aparecida Gonçalves','(31) 98877-1234','Rua Conselheiro Lafaiete','1420',
          'apto 302','Sagrada Família','Belo Horizonte/MG','31035-560',1);

INSERT INTO atendimentos (id,cliente_id,fase_id,vendedor_id,criado_em,atualizado_em)
  VALUES (1,1,8,2,${agora - 400 * dia},${agora - 300 * dia});

INSERT INTO orcamentos (id,numero,atendimento_id,vendedor_id,status,criado_em)
  VALUES (1,'${ano}-014',1,2,'aprovado',${agora - 400 * dia});

-- Data da instalação sai daqui: é o que decide a garantia e a primeira linha.
INSERT INTO orcamento_instalacao (orcamento_id,data_entrega)
  VALUES (1,${agora - 300 * dia});

-- 1) Ficha cheia: todo campo preenchido, relato longo (testa a quebra de linha).
INSERT INTO chamados (id,atendimento_id,orcamento_id,assunto,descricao,tipo,na_garantia,
                      prioridade,situacao,responsavel_id,instalador,valor,tipo_servico,
                      servico_outros,visita_em,criado_por,criado_em)
  VALUES (1,1,1,'Goteira na emenda do toldo',
          'Cliente relata que na chuva forte a água escorre pela emenda do lado direito e molha a área da churrasqueira. Já aconteceu três vezes desde a última chuva de janeiro, sempre no mesmo ponto.',
          'receptivo',0,'alta','aberto',2,'Anderson',35000,'vedacao',NULL,
          ${agora + 3 * dia},'Leticia Cordeiro',${agora - 2 * dia});

-- 2) Ficha vazia: o que o sistema não sabe tem que sair como linha em branco.
INSERT INTO chamados (id,atendimento_id,assunto,tipo,prioridade,situacao,criado_em)
  VALUES (2,1,'Motor não sobe','receptivo','media','aberto',${agora - 1 * dia});

-- 3) Serviço "outros" com descrição, fora da garantia.
INSERT INTO chamados (id,atendimento_id,orcamento_id,assunto,descricao,tipo,na_garantia,
                      prioridade,situacao,instalador,valor,tipo_servico,servico_outros,
                      visita_em,criado_em)
  VALUES (3,1,1,'Troca do motor','Motor queimado depois da queda de energia.',
          'receptivo',0,'media','em_andamento','Equipe própria',128000,'outros',
          'troca do motor e do controle',${agora + 7 * dia},${agora});
`);

console.log("pronto:", dbPath);
console.log("  /chamados/1/pdf  → ficha cheia");
console.log("  /chamados/2/pdf  → ficha em branco");
console.log("  /chamados/3/pdf  → serviço 'outros'");
