import "server-only";
import crypto from "node:crypto";

/**
 * O parâmetro `state` do OAuth, assinado.
 *
 * Serve contra CSRF: sem ele, alguém poderia induzir o vendedor a abrir uma
 * URL de retorno com um `code` de OUTRA conta Google, e o sistema ligaria a
 * agenda de um estranho ao vendedor sem ninguém perceber.
 *
 * Assinado com SESSION_SECRET, que já é o segredo do login. Vale 10 minutos:
 * é tempo de sobra para autorizar e curto para reaproveitar.
 */

const VALIDADE_MS = 10 * 60 * 1000;

function assinar(payload: string): string {
  const segredo = process.env.SESSION_SECRET ?? "";
  return crypto
    .createHmac("sha256", segredo)
    .update(payload)
    .digest("base64url");
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
  if (assinar(`${id}.${ts}`) !== sig) return null;
  const quando = Number(ts);
  if (!Number.isFinite(quando) || Date.now() - quando > VALIDADE_MS) return null;
  const vendedorId = Number(id);
  return Number.isInteger(vendedorId) && vendedorId > 0 ? vendedorId : null;
}
