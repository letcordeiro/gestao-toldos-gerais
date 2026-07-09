// Init do banco no boot do container: aplica migrations e faz o seed idempotente.
// Usa apenas dependências de produção (better-sqlite3 + drizzle-orm).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { FASES, MODELOS, VENDEDORES } from "./seed-data.mjs";

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
    "INSERT INTO modelos_toldo (nome, descricao_material, estrutura_aluminio, estrutura_ferro, fixacao_vedacao, estrutura_sempre_aluminio, usa_formato, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
  );
  const tx = sqlite.transaction(() => {
    for (const m of MODELOS)
      insert.run(
        m.nome,
        m.descricaoMaterial ?? null,
        m.estruturaAluminio ?? null,
        m.estruturaFerro ?? null,
        m.fixacaoVedacao ?? null,
        m.estruturaSempreAluminio ? 1 : 0,
        m.usaFormato ? 1 : 0
      );
  });
  tx();
  console.log(`✔ ${MODELOS.length} modelos criados`);
} else {
  console.log(`• Modelos já existem (${contarModelos}), pulando`);
}

// Garante as flags do modelo italiano em bancos que já existiam (idempotente)
const italiano = sqlite
  .prepare(
    "UPDATE modelos_toldo SET estrutura_sempre_aluminio = 1, usa_formato = 1 WHERE nome LIKE '%Italian%'"
  )
  .run();
if (italiano.changes > 0)
  console.log(`✔ flags do modelo italiano aplicadas (${italiano.changes})`);

// Seed de vendedores (idempotente)
const contarVendedores = sqlite
  .prepare("SELECT count(*) AS c FROM vendedores")
  .get().c;
if (contarVendedores === 0) {
  const insert = sqlite.prepare(
    "INSERT INTO vendedores (nome, telefone, email, ativo) VALUES (?, ?, ?, 1)"
  );
  const tx = sqlite.transaction(() => {
    for (const v of VENDEDORES)
      insert.run(v.nome, v.telefone ?? null, v.email ?? null);
  });
  tx();
  console.log(`✔ ${VENDEDORES.length} vendedor(es) criados`);
} else {
  console.log(`• Vendedores já existem (${contarVendedores}), pulando`);
}

// Senhas iniciais de vendedores via env VENDEDOR_SENHAS="email:senha,email2:senha2"
// Só define se o vendedor ainda não tem senha (não sobrescreve o do cadastro).
// Envolto em try/catch para NUNCA impedir o servidor de subir.
try {
  const senhasRaw = process.env.VENDEDOR_SENHAS ?? "";
  const pares = senhasRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (pares.length > 0) {
    const bcrypt = (await import("bcryptjs")).default;
    for (const par of pares) {
      const idx = par.indexOf(":");
      if (idx < 0) continue;
      const email = par.slice(0, idx).trim().toLowerCase();
      const senha = par.slice(idx + 1);
      if (!email || !senha) continue;
      const v = sqlite
        .prepare("SELECT id, senha_hash FROM vendedores WHERE lower(email) = ?")
        .get(email);
      if (v && !v.senha_hash) {
        sqlite
          .prepare("UPDATE vendedores SET senha_hash = ? WHERE id = ?")
          .run(bcrypt.hashSync(senha, 10), v.id);
        console.log(`✔ senha inicial definida para vendedor ${email}`);
      }
    }
  }
} catch (e) {
  console.warn("• VENDEDOR_SENHAS não aplicado (não crítico):", e.message);
}

// Backfill do link público por vendedor (link_token) — usa crypto nativo,
// sem dependência empacotada (evita a armadilha do bundling que derrubou o boot).
try {
  const { randomBytes } = await import("node:crypto");
  const semLink = sqlite
    .prepare(
      "SELECT id FROM vendedores WHERE link_token IS NULL OR link_token = ''"
    )
    .all();
  for (const v of semLink) {
    const tok = randomBytes(8).toString("base64url");
    sqlite
      .prepare("UPDATE vendedores SET link_token = ? WHERE id = ?")
      .run(tok, v.id);
  }
  if (semLink.length > 0)
    console.log(`✔ link_token gerado para ${semLink.length} vendedor(es)`);
} catch (e) {
  console.warn("• link_token não aplicado (não crítico):", e.message);
}

// Promove a gestor os e-mails listados em env VENDEDOR_GESTORES="email1,email2"
// (idempotente; garante que os gestores configurados sempre tenham o papel).
try {
  const gestoresRaw = process.env.VENDEDOR_GESTORES ?? "";
  const emails = gestoresRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  for (const email of emails) {
    const r = sqlite
      .prepare(
        "UPDATE vendedores SET papel = 'gestor' WHERE lower(email) = ? AND papel <> 'gestor'"
      )
      .run(email);
    if (r.changes > 0) console.log(`✔ vendedor ${email} promovido a gestor`);
  }
} catch (e) {
  console.warn("• VENDEDOR_GESTORES não aplicado (não crítico):", e.message);
}

sqlite.close();
console.log(`✔ Banco pronto em ${dbPath}`);
