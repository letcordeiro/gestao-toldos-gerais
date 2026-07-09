import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
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

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** E-mail é reconhecido pelo sistema (existe no env OU na tabela de usuários). */
export async function emailReconhecido(email: string): Promise<boolean> {
  const alvo = normalizarEmail(email);
  if (getUsers().some((u) => u.email.toLowerCase() === alvo)) return true;
  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, alvo),
  });
  return Boolean(usuario);
}

// Prioridade: se há usuário no banco (senha já redefinida), valida por ele (bcrypt).
// Senão, cai no AUTH_USERS do env (senha inicial / master, texto puro).
export async function validarCredenciais(
  email: string,
  senha: string
): Promise<boolean> {
  const alvo = normalizarEmail(email);
  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, alvo),
  });
  if (usuario) {
    return bcrypt.compare(senha, usuario.senhaHash);
  }
  return getUsers().some(
    (u) => u.email.toLowerCase() === alvo && u.senha === senha
  );
}

/** Redefine a senha (cria/atualiza a linha em usuarios com hash bcrypt). */
export async function redefinirSenhaUsuario(
  email: string,
  novaSenha: string
): Promise<void> {
  const alvo = normalizarEmail(email);
  const hash = await bcrypt.hash(novaSenha, 10);
  const existente = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, alvo),
  });
  if (existente) {
    await db
      .update(usuarios)
      .set({ senhaHash: hash, atualizadoEm: new Date() })
      .where(eq(usuarios.id, existente.id));
  } else {
    await db.insert(usuarios).values({ email: alvo, senhaHash: hash });
  }
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
