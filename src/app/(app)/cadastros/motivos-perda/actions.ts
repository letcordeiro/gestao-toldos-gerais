"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { atendimentos, motivosPerda } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";

const schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Escreva o motivo").max(80),
});

export type MotivoFormState = { ok?: boolean; erro?: string };

export async function salvarMotivo(
  _prev: MotivoFormState,
  formData: FormData
): Promise<MotivoFormState> {
  await exigirGestor();
  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  if (parsed.data.id) {
    await db
      .update(motivosPerda)
      .set({ nome: parsed.data.nome })
      .where(eq(motivosPerda.id, parsed.data.id));
  } else {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${motivosPerda.ordem}), 0)` })
      .from(motivosPerda);
    await db
      .insert(motivosPerda)
      .values({ nome: parsed.data.nome, ordem: max + 1 });
  }
  revalidatePath("/cadastros/motivos-perda");
  return { ok: true };
}

export async function alternarMotivo(id: number, ativo: boolean) {
  await exigirGestor();
  const mid = z.coerce.number().int().positive().parse(id);
  await db.update(motivosPerda).set({ ativo }).where(eq(motivosPerda.id, mid));
  revalidatePath("/cadastros/motivos-perda");
}

export async function excluirMotivo(id: number): Promise<{ erro?: string }> {
  await exigirGestor();
  const mid = z.coerce.number().int().positive().parse(id);

  // Motivo em uso não some: o relatório de perdas ficaria sem legenda.
  // Para tirar de circulação, é o botão de ativo/inativo.
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(atendimentos)
    .where(eq(atendimentos.motivoPerdaId, mid));
  if (n > 0) {
    return {
      erro: `Este motivo já foi usado em ${n} atendimento(s). Desative em vez de excluir.`,
    };
  }

  await db.delete(motivosPerda).where(eq(motivosPerda.id, mid));
  revalidatePath("/cadastros/motivos-perda");
  return {};
}
