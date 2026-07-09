"use server";

import { revalidatePath } from "next/cache";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { atendimentos, fases } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";

const faseSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Informe o nome"),
  ordem: z.coerce.number().int().min(1, "Ordem deve ser 1 ou maior"),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
});

export type FaseFormState = { erro?: string; ok?: boolean };

export async function salvarFase(
  _prev: FaseFormState,
  formData: FormData
): Promise<FaseFormState> {
  await exigirGestor();

  const parsed = faseSchema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    ordem: formData.get("ordem"),
    cor: formData.get("cor"),
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const { id, ...valores } = parsed.data;

  if (id) {
    await db.update(fases).set(valores).where(eq(fases.id, id));
  } else {
    await db.insert(fases).values(valores);
  }

  revalidatePath("/cadastros/fases");
  revalidatePath("/atendimentos");
  return { ok: true };
}

export async function excluirFase(id: number): Promise<{ erro?: string }> {
  await exigirGestor();
  const faseId = z.coerce.number().int().positive().parse(id);

  const [{ total }] = await db
    .select({ total: count() })
    .from(atendimentos)
    .where(eq(atendimentos.faseId, faseId));

  if (total > 0) {
    return { erro: `Fase em uso por ${total} atendimento(s).` };
  }

  await db.delete(fases).where(eq(fases.id, faseId));
  revalidatePath("/cadastros/fases");
  revalidatePath("/atendimentos");
  return {};
}
