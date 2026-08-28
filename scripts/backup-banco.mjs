// Cópia de segurança do banco.
//
// Usa a API de backup do próprio SQLite (db.backup) em vez de copiar o
// arquivo: com WAL ligado, `cp` no meio de uma escrita gera um banco
// inconsistente que só se descobre na hora de restaurar.
//
// Uso:
//   npm run backup                       → guarda em BACKUP_DIR (ou ~/toldos-backups)
//   BACKUP_DIR=/mnt/backups npm run backup
//   BACKUP_MANTER=60 npm run backup      → retenção em dias (padrão 30)
//
// No Mac, o destino padrão fica FORA da pasta sincronizada de propósito:
// backup dentro do iCloud não é backup, é a mesma pasta que pode falhar.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const origem = process.env.DATABASE_PATH ?? "./data/toldos.db";
const destinoDir =
  process.env.BACKUP_DIR ?? path.join(os.homedir(), "toldos-backups");
const manterDias = Number(process.env.BACKUP_MANTER ?? 30);

if (!fs.existsSync(origem)) {
  console.error(`✖ banco não encontrado em ${origem}`);
  process.exit(1);
}

fs.mkdirSync(destinoDir, { recursive: true });

const agora = new Date();
const carimbo = [
  agora.getFullYear(),
  String(agora.getMonth() + 1).padStart(2, "0"),
  String(agora.getDate()).padStart(2, "0"),
  "-",
  String(agora.getHours()).padStart(2, "0"),
  String(agora.getMinutes()).padStart(2, "0"),
].join("");
const destino = path.join(destinoDir, `toldos-${carimbo}.db`);

const db = new Database(origem, { readonly: true });
await db.backup(destino);
db.close();

// Um backup que não abre não é backup. Confere antes de dizer que deu certo.
const copia = new Database(destino, { readonly: true });
const integridade = copia.pragma("integrity_check", { simple: true });
const tabelas = copia
  .prepare("select count(*) as n from sqlite_master where type='table'")
  .get().n;
const clientes = copia.prepare("select count(*) as n from clientes").get().n;
const orcamentos = copia
  .prepare("select count(*) as n from orcamentos")
  .get().n;
copia.close();

if (integridade !== "ok") {
  console.error(`✖ backup gerado mas com defeito: ${integridade}`);
  fs.unlinkSync(destino);
  process.exit(1);
}

const tamanho = (fs.statSync(destino).size / 1024 / 1024).toFixed(1);
console.log(
  `✔ ${path.basename(destino)} — ${tamanho} MB · ${tabelas} tabelas · ` +
    `${clientes} clientes · ${orcamentos} orçamentos`
);

// Retenção: apaga o que passou do prazo, mas NUNCA deixa a pasta vazia —
// se a rotina ficar parada por meses, a cópia velha é melhor que nenhuma.
const corte = Date.now() - manterDias * 24 * 60 * 60 * 1000;
const copias = fs
  .readdirSync(destinoDir)
  .filter((f) => /^toldos-\d{8}-\d{4}\.db$/.test(f))
  .map((f) => ({ f, mtime: fs.statSync(path.join(destinoDir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

const velhas = copias.slice(1).filter((c) => c.mtime < corte);
for (const c of velhas) fs.unlinkSync(path.join(destinoDir, c.f));

console.log(
  `  ${copias.length - velhas.length} cópia(s) em ${destinoDir}` +
    (velhas.length ? ` · ${velhas.length} antiga(s) removida(s)` : "")
);
