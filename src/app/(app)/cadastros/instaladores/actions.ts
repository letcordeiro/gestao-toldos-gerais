"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { instalacaoEquipe, instaladores } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";

const schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Informe o nome").max(120),
  telefone: z.string().trim().max(30).transform((v) => v || null),
  comissaoPadraoPercent: z
    .union([z.literal(""), z.coerce.number().min(0).max(100)])
    .transform((v) => (v === "" || v === 0 ? null : v)),
  observacoes: z.string().trim().max(2000).transform((v) => v || null),
});

export type InstaladorFormState = { ok?: boolean; erro?: string };

export async function salvarInstalador(
  _prev: InstaladorFormState,
  formData: FormData
): Promise<InstaladorFormState> {
  await exigirGestor();
  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    telefone: formData.get("telefone") ?? "",
    comissaoPadraoPercent: formData.get("comissaoPadraoPercent") ?? "",
    observacoes: formData.get("observacoes") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const { id, ...valores } = parsed.data;

  if (id) await db.update(instaladores).set(valores).where(eq(instaladores.id, id));
  else await db.insert(instaladores).values(valores);

  revalidatePath("/cadastros/instaladores");
  return { ok: true };
}

export async function alternarInstalador(id: number, ativo: boolean) {
  await exigirGestor();
  const iid = z.coerce.number().int().positive().parse(id);
  await db.update(instaladores).set({ ativo }).where(eq(instaladores.id, iid));
  revalidatePath("/cadastros/instaladores");
}

export async function excluirInstalador(id: number): Promise<{ erro?: string }> {
  await exigirGestor();
  const iid = z.coerce.number().int().positive().parse(id);

  // Instalador que já trabalhou em obra não some: a comissão paga ficaria sem
  // dono no histórico.
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(instalacaoEquipe)
    .where(eq(instalacaoEquipe.instaladorId, iid));
  if (n > 0) {
    return { erro: `Já participou de ${n} instalação(ões). Desative em vez de excluir.` };
  }

  await db.delete(instaladores).where(eq(instaladores.id, iid));
  revalidatePath("/cadastros/instaladores");
  return {};
}
