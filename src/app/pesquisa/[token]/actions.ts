"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pesquisas } from "@/db/schema";

const respostaSchema = z.object({
  token: z.string().trim().min(1),
  nota: z.coerce
    .number()
    .int("Escolha uma nota")
    .min(0, "Nota inválida")
    .max(10, "Nota inválida"),
  comentario: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || null),
});

export type RespostaState = { ok?: boolean; erro?: string };

/**
 * Página pública: sem sessão. A trava é o token — quem não tem o link não
 * responde, e cada token vale por um atendimento.
 */
export async function responderPesquisa(
  _prev: RespostaState,
  formData: FormData
): Promise<RespostaState> {
  const parsed = respostaSchema.safeParse({
    token: formData.get("token"),
    nota: formData.get("nota"),
    comentario: formData.get("comentario") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const pesquisa = await db.query.pesquisas.findFirst({
    where: eq(pesquisas.token, parsed.data.token),
  });
  if (!pesquisa) return { erro: "Pesquisa não encontrada." };

  // Responder de novo sobrescreve: se o cliente errou o toque na nota, ele
  // corrige em vez de ficar preso à primeira.
  await db
    .update(pesquisas)
    .set({
      nota: parsed.data.nota,
      comentario: parsed.data.comentario,
      respondidaEm: new Date(),
    })
    .where(eq(pesquisas.id, pesquisa.id));

  revalidatePath("/pesquisas");
  revalidatePath("/painel");
  return { ok: true };
}
