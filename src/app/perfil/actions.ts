"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { vendedores } from "@/db/schema";
import { exigirUsuario, temNomeSobrenome } from "@/lib/auth";

const perfilSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe seu nome")
    .refine(temNomeSobrenome, "Informe nome e sobrenome"),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido"),
  telefoneFixo: z.string().trim().optional(),
});

export type PerfilState = { erro?: string };

export async function salvarPerfil(
  _prev: PerfilState,
  formData: FormData
): Promise<PerfilState> {
  const usuario = await exigirUsuario();
  if (usuario.vendedorId == null) {
    redirect("/atendimentos");
  }

  const parsed = perfilSchema.safeParse({
    nome: formData.get("nome"),
    whatsapp: formData.get("whatsapp"),
    telefoneFixo: formData.get("telefoneFixo") || undefined,
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  await db
    .update(vendedores)
    .set({
      nome: dados.nome,
      whatsapp: dados.whatsapp,
      telefoneFixo: dados.telefoneFixo || null,
    })
    .where(eq(vendedores.id, usuario.vendedorId));

  revalidatePath("/perfil");
  revalidatePath("/painel");
  redirect("/painel");
}
