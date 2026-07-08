import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type DB = BetterSQLite3Database<typeof schema>;

let instancia: DB | null = null;

// Abre o banco de forma preguiçosa: evita instanciar o SQLite durante o
// `next build` (onde DATABASE_PATH pode não existir) — só na primeira query.
function getDb(): DB {
  if (!instancia) {
    const dbPath = process.env.DATABASE_PATH ?? "./data/toldos.db";
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    instancia = drizzle(sqlite, { schema });
  }
  return instancia;
}

export const db = new Proxy({} as DB, {
  get(_alvo, prop, receiver) {
    const real = getDb();
    const valor = Reflect.get(real, prop, receiver);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});
