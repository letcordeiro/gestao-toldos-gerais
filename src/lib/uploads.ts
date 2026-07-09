import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Diretório de uploads. Por padrão fica ao lado do banco (mesmo volume /data
// em produção), sem precisar de env extra. Pode ser sobrescrito por UPLOADS_DIR.
export function uploadsDir(): string {
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR;
  const dbPath = process.env.DATABASE_PATH ?? "./data/toldos.db";
  return path.join(path.dirname(path.resolve(dbPath)), "uploads");
}

function dirFotos(orcamentoId: number): string {
  return path.join(uploadsDir(), "orcamentos", String(orcamentoId));
}

export function caminhoFoto(orcamentoId: number, arquivo: string): string {
  // Barreira contra path traversal: só o basename é aceito.
  return path.join(dirFotos(orcamentoId), path.basename(arquivo));
}

const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_FOTO_BYTES = 8 * 1024 * 1024; // 8 MB

export type SalvarFotoResultado =
  | { ok: true; arquivo: string }
  | { ok: false; erro: string };

/** Salva um arquivo de imagem no disco e devolve o nome gerado. */
export async function salvarFoto(
  orcamentoId: number,
  file: File
): Promise<SalvarFotoResultado> {
  const ext = EXTENSOES[file.type];
  if (!ext) return { ok: false, erro: "Envie uma imagem JPG, PNG ou WEBP" };
  if (file.size === 0) return { ok: false, erro: "Arquivo vazio" };
  if (file.size > MAX_FOTO_BYTES)
    return { ok: false, erro: "Imagem muito grande (máx. 8 MB)" };

  const dir = dirFotos(orcamentoId);
  await fsp.mkdir(dir, { recursive: true });
  const arquivo = `${randomBytes(8).toString("hex")}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await fsp.writeFile(path.join(dir, arquivo), bytes);
  return { ok: true, arquivo };
}

/** Lê os bytes de uma foto (ou null se não existir). */
export function lerFoto(orcamentoId: number, arquivo: string): Buffer | null {
  const p = caminhoFoto(orcamentoId, arquivo);
  try {
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

export function contentTypeFoto(arquivo: string): string {
  const ext = path.extname(arquivo).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

/** Remove o arquivo do disco (ignora se já não existe). */
export async function removerFotoArquivo(
  orcamentoId: number,
  arquivo: string
): Promise<void> {
  try {
    await fsp.unlink(caminhoFoto(orcamentoId, arquivo));
  } catch {
    // arquivo já removido — ok
  }
}
