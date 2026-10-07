import "server-only";
import crypto from "node:crypto";

/**
 * O parâmetro `state` do OAuth, assinado.
 *
 * Serve contra CSRF: sem ele, alguém poderia induzir o vendedor a abrir uma
 * URL de retorno com um `code` de OUTRA conta Google, e o sistema ligaria a
 * agenda de um estranho ao vendedor sem ninguém perceber.
 *
 * Assinado com SESSION_SECRET (com prefixo próprio — ver DOMINIO). Vale 10 minutos:
 * é tempo de sobra para autorizar e curto para reaproveitar.
 */

const VALIDADE_MS = 10 * 60 * 1000;

/**
 * O prefixo separa esta assinatura da do cookie de sessão. Sem ele, os dois
 * usavam o MESMO segredo e o MESMO formato (`a.b.HMAC(a.b)`): o `state` que
 * aparece na barra de endereço ao conectar a agenda passava como cookie de
 * login válido (auditoria de 07/10/2026). Com o prefixo, uma assinatura não
 * serve no lugar da outra.
 */
const DOMINIO = "oauth-state:";

function assinar(payload: string): string {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo) throw new Error("SESSION_SECRET não definido");
  return crypto
    .createHmac("sha256", segredo)
    .update(DOMINIO + payload)
    .digest("base64url");
}

/** Compara assinaturas sem vazar, pelo tempo de resposta, quanto acertou. */
function mesmaAssinatura(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function criarEstado(vendedorId: number): string {
  const payload = `${vendedorId}.${Date.now()}`;
  return `${payload}.${assinar(payload)}`;
}

/** Devolve o vendedorId quando o estado é legítimo e recente; senão, null. */
export function lerEstado(estado: string | null): number | null {
  if (!estado) return null;
  const partes = estado.split(".");
  if (partes.length !== 3) return null;
  const [id, ts, sig] = partes;
  if (!mesmaAssinatura(assinar(`${id}.${ts}`), sig)) return null;
  const quando = Number(ts);
  if (!Number.isFinite(quando) || Date.now() - quando > VALIDADE_MS) return null;
  const vendedorId = Number(id);
  return Number.isInteger(vendedorId) && vendedorId > 0 ? vendedorId : null;
}
