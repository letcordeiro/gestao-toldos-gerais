"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tokensSenha } from "@/db/schema";
import { redefinirSenhaUsuario } from "@/lib/auth";

const schema = z
  .object({
    token: z.string().trim().min(10),
    novaSenha: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
    confirmar: z.string(),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: "A confirmação não confere com a senha",
    path: ["confirmar"],
  });

export type RedefinirState = { erro?: string; ok?: boolean };

function hash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Token válido = existe, não usado e dentro do prazo. */
export async function tokenValido(token: string): Promise<boolean> {
  const linha = await db.query.tokensSenha.findFirst({
    where: eq(tokensSenha.tokenHash, hash(token)),
  });
  if (!linha || linha.usadoEm) return false;
  return linha.expiraEm.getTime() > Date.now();
}

export async function redefinirComToken(
  _prev: RedefinirState,
  formData: FormData
): Promise<RedefinirState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    novaSenha: formData.get("novaSenha"),
    confirmar: formData.get("confirmar"),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { token, novaSenha } = parsed.data;
  const linha = await db.query.tokensSenha.findFirst({
    where: eq(tokensSenha.tokenHash, hash(token)),
  });

  if (!linha || linha.usadoEm || linha.expiraEm.getTime() <= Date.now()) {
    return {
      erro: "Este link não vale mais. Peça um novo em “Esqueci minha senha”.",
    };
  }

  await redefinirSenhaUsuario(linha.email, novaSenha);
  // Uso único: queima o token na hora.
  await db
    .update(tokensSenha)
    .set({ usadoEm: new Date() })
    .where(eq(tokensSenha.id, linha.id));

  // Sai da página do token: ela revalida o token (agora queimado) e mostraria
  // "link expirado" logo após o sucesso. A confirmação fica em tela própria.
  redirect("/senha-alterada");
}
