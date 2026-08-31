import "server-only";
import crypto from "node:crypto";

/**
 * Cifragem de segredo guardado no banco (AES-256-GCM).
 *
 * Usada no token da agenda do Google. É o token que dá acesso à agenda da
 * pessoa: em texto puro, um vazamento do arquivo do banco — ou um backup
 * esquecido em algum lugar — entrega a agenda de todo mundo.
 *
 * GCM e não CBC porque GCM autentica: texto adulterado falha ao decifrar em
 * vez de devolver lixo que o resto do código trataria como token válido.
 *
 * A chave vem de AGENDA_ENCRYPTION_KEY (64 caracteres hex = 32 bytes).
 * Perder a chave NÃO é catástrofe: ninguém perde dado do sistema, só é preciso
 * cada vendedor conectar a agenda de novo. Trocar a chave tem o mesmo efeito.
 */

const NOME_ENV = "AGENDA_ENCRYPTION_KEY";

function chave(): Buffer {
  const bruta = process.env[NOME_ENV];
  if (!bruta) throw new Error(`${NOME_ENV} não definido`);
  const buf = Buffer.from(bruta.trim(), "hex");
  if (buf.length !== 32) {
    throw new Error(`${NOME_ENV} precisa ter 64 caracteres hexadecimais`);
  }
  return buf;
}

/** A integração só aparece na tela quando há chave configurada. */
export function temChaveDeCripto(): boolean {
  try {
    chave();
    return true;
  } catch {
    return false;
  }
}

/** Texto → "iv.tag.conteudo", tudo em base64url. */
export function cifrar(texto: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados]
    .map((b) => b.toString("base64url"))
    .join(".");
}

/**
 * Volta ao texto original. Devolve null quando não dá — chave trocada, dado
 * adulterado, formato antigo. Null aqui significa "reconecte a agenda", que é
 * bem melhor do que derrubar a tela inteira.
 */
export function decifrar(guardado: string): string | null {
  try {
    const partes = guardado.split(".");
    if (partes.length !== 3) return null;
    const [iv, tag, dados] = partes.map((p) => Buffer.from(p, "base64url"));
    const d = crypto.createDecipheriv("aes-256-gcm", chave(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
