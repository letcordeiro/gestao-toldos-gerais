// Testa a rotina de backup de ponta a ponta num banco descartável: gera a
// cópia, confere que ela ABRE e que os dados chegaram, e verifica a retenção.
// Backup que ninguém testa é fé, não é backup.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "toldos-backup-"));
const banco = path.join(tmp, "origem.db");
const destino = path.join(tmp, "copias");

const db = new Database(banco);
db.pragma("journal_mode = WAL");
db.exec("CREATE TABLE clientes (id integer primary key, nome text)");
db.exec("CREATE TABLE orcamentos (id integer primary key)");
const ins = db.prepare("INSERT INTO clientes (nome) VALUES (?)");
for (const nome of ["Ana", "Bruno", "Carla"]) ins.run(nome);
// Deixa uma escrita pendente no WAL: é o caso em que um `cp` cru falharia.
db.prepare("INSERT INTO orcamentos DEFAULT VALUES").run();

function rodar(env = {}) {
  return execFileSync(process.execPath, ["scripts/backup-banco.mjs"], {
    env: { ...process.env, DATABASE_PATH: banco, BACKUP_DIR: destino, ...env },
    encoding: "utf8",
  });
}

const falhas = [];
const conferir = (ok, msg) => (ok ? console.log(`  ✓ ${msg}`) : falhas.push(msg));

rodar();
const copias = fs.readdirSync(destino).filter((f) => f.endsWith(".db"));
conferir(copias.length === 1, "gerou uma cópia");

const copia = new Database(path.join(destino, copias[0]), { readonly: true });
conferir(
  copia.pragma("integrity_check", { simple: true }) === "ok",
  "a cópia passa no integrity_check"
);
conferir(
  copia.prepare("select count(*) n from clientes").get().n === 3,
  "os 3 clientes chegaram na cópia"
);
// A linha escrita com o WAL aberto precisa estar lá — é o motivo de usar
// db.backup() em vez de copiar o arquivo.
conferir(
  copia.prepare("select count(*) n from orcamentos").get().n === 1,
  "escrita pendente no WAL entrou na cópia"
);
copia.close();
db.close();

// Retenção: uma cópia velha some, mas a última fica mesmo se estiver vencida.
const velha = path.join(destino, "toldos-20200101-0000.db");
fs.copyFileSync(path.join(destino, copias[0]), velha);
fs.utimesSync(velha, new Date(2020, 0, 1), new Date(2020, 0, 1));
rodar({ BACKUP_MANTER: "1" });
conferir(!fs.existsSync(velha), "cópia vencida é removida");
conferir(
  fs.readdirSync(destino).filter((f) => f.endsWith(".db")).length > 0,
  "a pasta nunca fica vazia"
);

fs.rmSync(tmp, { recursive: true, force: true });

if (falhas.length > 0) {
  console.error("❌ backup:", falhas.join(" · "));
  process.exit(1);
}
console.log("✅ backup: cópia íntegra, dados conferidos e retenção funcionando");
