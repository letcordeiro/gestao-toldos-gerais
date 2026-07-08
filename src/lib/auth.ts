import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "./session";

// Usuários definidos por env: AUTH_USERS="email1:senha1,email2:senha2"
function getUsers(): Array<{ email: string; senha: string }> {
  const raw = process.env.AUTH_USERS ?? "";
  return raw
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf(":");
      return { email: pair.slice(0, idx).trim(), senha: pair.slice(idx + 1) };
    });
}

export function validarCredenciais(email: string, senha: string): boolean {
  return getUsers().some(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha
  );
}

export async function criarSessao(email: string) {
  const token = await createSessionToken(email);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function encerrarSessao() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessao(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function exigirSessao(): Promise<{ email: string }> {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");
  return sessao;
}
