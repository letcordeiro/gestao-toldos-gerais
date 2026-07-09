import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { usuarios, vendedores } from "@/db/schema";
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

async function vendedorPorEmail(email: string) {
  const alvo = normalizarEmail(email);
  if (!alvo) return null;
  return db.query.vendedores.findFirst({
    where: and(eq(vendedores.email, alvo), eq(vendedores.ativo, true)),
  });
}

/** E-mail é reconhecido (env, tabela de usuários OU vendedor com login). */
export async function emailReconhecido(email: string): Promise<boolean> {
  const alvo = normalizarEmail(email);
  if (getUsers().some((u) => u.email.toLowerCase() === alvo)) return true;
  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, alvo),
  });
  if (usuario) return true;
  const vendedor = await vendedorPorEmail(alvo);
  return Boolean(vendedor);
}

// Prioridade: usuarios (senha redefinida) > vendedor com senha > AUTH_USERS (env, master).
export async function validarCredenciais(
  email: string,
  senha: string
): Promise<boolean> {
  const alvo = normalizarEmail(email);

  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, alvo),
  });
  if (usuario) return bcrypt.compare(senha, usuario.senhaHash);

  const vendedor = await vendedorPorEmail(alvo);
  if (vendedor?.senhaHash) return bcrypt.compare(senha, vendedor.senhaHash);

  return getUsers().some(
    (u) => u.email.toLowerCase() === alvo && u.senha === senha
  );
}

/** Redefine a senha: se for vendedor, na tabela vendedores; senão em usuarios. */
export async function redefinirSenhaUsuario(
  email: string,
  novaSenha: string
): Promise<void> {
  const alvo = normalizarEmail(email);
  const hash = await bcrypt.hash(novaSenha, 10);

  const vendedor = await vendedorPorEmail(alvo);
  if (vendedor) {
    await db
      .update(vendedores)
      .set({ senhaHash: hash })
      .where(eq(vendedores.id, vendedor.id));
    return;
  }

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

/** Define a senha de acesso de um vendedor (bcrypt). Vazio remove o acesso. */
export async function definirSenhaVendedor(
  vendedorId: number,
  senha: string
): Promise<void> {
  const hash = senha ? await bcrypt.hash(senha, 10) : null;
  await db
    .update(vendedores)
    .set({ senhaHash: hash })
    .where(eq(vendedores.id, vendedorId));
}

/** Vendedor correspondente à sessão logada (ou null se for admin/env). */
export async function vendedorDaSessao(): Promise<{
  id: number;
  nome: string;
} | null> {
  const sessao = await getSessao();
  if (!sessao) return null;
  const v = await vendedorPorEmail(sessao.email);
  return v ? { id: v.id, nome: v.nome } : null;
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
