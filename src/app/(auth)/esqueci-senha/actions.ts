"use server";

import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tokensSenha } from "@/db/schema";
import { emailReconhecido } from "@/lib/auth";
import { emailConfigurado, enviarEmail, emailRedefinirSenha } from "@/lib/email";
import { urlBase } from "@/lib/url";

const VALIDADE_MIN = 60;

const schema = z.object({ email: z.string().trim().email("E-mail inválido") });

export type RecuperarState = { erro?: string; ok?: boolean };

/** Guardamos só o hash — o token em claro existe apenas dentro do e-mail. */
function hash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function pedirLinkDeSenha(
  _prev: RecuperarState,
  formData: FormData
): Promise<RecuperarState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  if (!emailConfigurado()) {
    return {
      erro:
        "O envio de e-mail ainda não está configurado. Fale com o gestor para redefinir sua senha.",
    };
  }

  const email = parsed.data.email.toLowerCase();

  // Só envia se o e-mail existir de verdade — mas a resposta ao usuário é
  // sempre a mesma, para não revelar quem tem conta no sistema.
  if (await emailReconhecido(email)) {
    // Invalida pedidos anteriores ainda não usados desse e-mail.
    await db
      .update(tokensSenha)
      .set({ usadoEm: new Date() })
      .where(and(eq(tokensSenha.email, email), isNull(tokensSenha.usadoEm)));

    const token = crypto.randomBytes(32).toString("hex");
    await db.insert(tokensSenha).values({
      email,
      tokenHash: hash(token),
      expiraEm: new Date(Date.now() + VALIDADE_MIN * 60 * 1000),
    });

    const base = await urlBase();
    const link = `${base}/redefinir-senha/${token}`;
    const corpo = emailRedefinirSenha(link);
    try {
      await enviarEmail({
        para: email,
        assunto: "Redefinir sua senha — Toldos Gerais",
        html: corpo.html,
        texto: corpo.texto,
      });
    } catch {
      return {
        erro:
          "Não consegui enviar o e-mail agora. Tente de novo em alguns minutos ou fale com o gestor.",
      };
    }
  }

  return { ok: true };
}
