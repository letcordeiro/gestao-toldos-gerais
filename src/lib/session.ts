// Sessão com token assinado (HMAC-SHA256 via Web Crypto) — funciona em Node e Edge (middleware).

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não definido");
  return secret;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(sig);
}

export const SESSION_COOKIE = "tg_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function emailToBase64Url(email: string): string {
  return btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function emailFromBase64Url(enc: string): string {
  return atob(enc.replace(/-/g, "+").replace(/_/g, "/"));
}

export async function createSessionToken(email: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${emailToBase64Url(email)}.${exp}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined
): Promise<{ email: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [emailEnc, expStr, sig] = parts;
  const expected = await hmac(`${emailEnc}.${expStr}`);
  if (sig !== expected) return null;
  if (parseInt(expStr, 10) < Math.floor(Date.now() / 1000)) return null;
  try {
    return { email: emailFromBase64Url(emailEnc) };
  } catch {
    return null;
  }
}
