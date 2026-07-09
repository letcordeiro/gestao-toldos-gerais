"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { vendedores } from "@/db/schema";
import { exigirSessao } from "@/lib/auth";

const vendedorSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Informe o nome"),
  telefone: z.string().trim().optional(),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
});

export type VendedorFormState = { erro?: string; ok?: boolean };

export async function salvarVendedor(
  _prev: VendedorFormState,
  formData: FormData
): Promise<VendedorFormState> {
  await exigirSessao();

  const parsed = vendedorSchema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    telefone: formData.get("telefone") || undefined,
    email: formData.get("email") || undefined,
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const valores = {
    nome: dados.nome,
    telefone: dados.telefone || null,
    email: dados.email || null,
  };

  if (dados.id) {
    await db.update(vendedores).set(valores).where(eq(vendedores.id, dados.id));
  } else {
    await db.insert(vendedores).values(valores);
  }

  revalidatePath("/cadastros/vendedores");
  return { ok: true };
}

export async function alternarAtivoVendedor(id: number, ativo: boolean) {
  await exigirSessao();
  await db
    .update(vendedores)
    .set({ ativo })
    .where(eq(vendedores.id, z.coerce.number().int().positive().parse(id)));
  revalidatePath("/cadastros/vendedores");
}
