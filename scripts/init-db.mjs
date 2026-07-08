// Init do banco no boot do container: aplica migrations e faz o seed idempotente.
// Usa apenas dependências de produção (better-sqlite3 + drizzle-orm).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { FASES, MODELOS } from "./seed-data.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH ?? "./data/toldos.db";

// Garante que a pasta do banco existe (volume persistente pode vir vazio)
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// 1) Migrations (cria/atualiza tabelas; controla o que já foi aplicado)
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: path.join(aqui, "..", "drizzle") });
console.log("✔ Migrations aplicadas");

// 2) Seed idempotente
const contarFases = sqlite.prepare("SELECT count(*) AS c FROM fases").get().c;
if (contarFases === 0) {
  const insert = sqlite.prepare(
    "INSERT INTO fases (nome, ordem, cor) VALUES (?, ?, ?)"
  );
  const tx = sqlite.transaction(() => {
    for (const f of FASES) insert.run(f.nome, f.ordem, f.cor);
  });
  tx();
  console.log(`✔ ${FASES.length} fases criadas`);
} else {
  console.log(`• Fases já existem (${contarFases}), pulando`);
}

const contarModelos = sqlite
  .prepare("SELECT count(*) AS c FROM modelos_toldo")
  .get().c;
if (contarModelos === 0) {
  const insert = sqlite.prepare(
    "INSERT INTO modelos_toldo (nome, descricao_material, estrutura_aluminio, estrutura_ferro, fixacao_vedacao, ativo) VALUES (?, ?, ?, ?, ?, 1)"
  );
  const tx = sqlite.transaction(() => {
    for (const m of MODELOS)
      insert.run(
        m.nome,
        m.descricaoMaterial ?? null,
        m.estruturaAluminio ?? null,
        m.estruturaFerro ?? null,
        m.fixacaoVedacao ?? null
      );
  });
  tx();
  console.log(`✔ ${MODELOS.length} modelos criados`);
} else {
  console.log(`• Modelos já existem (${contarModelos}), pulando`);
}

sqlite.close();
console.log(`✔ Banco pronto em ${dbPath}`);
