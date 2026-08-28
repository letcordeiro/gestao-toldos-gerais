"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { atendimentos, canais } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";

const schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Escreva o nome do canal").max(80),
  noCadastroPublico: z
    .union([z.literal("on"), z.literal("true"), z.null(), z.literal("")])
    .transform((v) => v === "on" || v === "true"),
});

export type CanalFormState = { ok?: boolean; erro?: string };

export async function salvarCanal(
  _prev: CanalFormState,
  formData: FormData
): Promise<CanalFormState> {
  await exigirGestor();
  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    noCadastroPublico: formData.get("noCadastroPublico"),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const { id, ...valores } = parsed.data;

  if (id) {
    await db.update(canais).set(valores).where(eq(canais.id, id));
  } else {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${canais.ordem}), 0)` })
      .from(canais);
    await db.insert(canais).values({ ...valores, ordem: max + 1 });
  }
  revalidatePath("/cadastros/canais");
  return { ok: true };
}

export async function alternarCanal(id: number, ativo: boolean) {
  await exigirGestor();
  const cid = z.coerce.number().int().positive().parse(id);
  await db.update(canais).set({ ativo }).where(eq(canais.id, cid));
  revalidatePath("/cadastros/canais");
}

export async function excluirCanal(id: number): Promise<{ erro?: string }> {
  await exigirGestor();
  const cid = z.coerce.number().int().positive().parse(id);

  // Canal já usado não some: o relatório de origem ficaria sem legenda.
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(atendimentos)
    .where(eq(atendimentos.canalId, cid));
  if (n > 0) {
    return { erro: `Já usado em ${n} atendimento(s). Desative em vez de excluir.` };
  }

  await db.delete(canais).where(eq(canais.id, cid));
  revalidatePath("/cadastros/canais");
  return {};
}
