"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { vendedores } from "@/db/schema";
import {
  exigirUsuario,
  redefinirSenhaUsuario,
  temNomeSobrenome,
  validarCredenciais,
} from "@/lib/auth";

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
    redirect("/painel");
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

// --- Troca de senha (Senha atual + Nova + Confirmar) ---

const senhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual"),
    novaSenha: z
      .string()
      .min(6, "A nova senha precisa ter ao menos 6 caracteres"),
    confirmar: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: "A confirmação não confere com a nova senha",
    path: ["confirmar"],
  });

export type SenhaState = { erro?: string; ok?: boolean };

export async function alterarSenha(
  _prev: SenhaState,
  formData: FormData
): Promise<SenhaState> {
  const usuario = await exigirUsuario();

  const parsed = senhaSchema.safeParse({
    senhaAtual: formData.get("senhaAtual"),
    novaSenha: formData.get("novaSenha"),
    confirmar: formData.get("confirmar"),
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  // Confere a senha atual antes de trocar.
  const confere = await validarCredenciais(usuario.email, dados.senhaAtual);
  if (!confere) {
    return { erro: "Senha atual incorreta" };
  }

  await redefinirSenhaUsuario(usuario.email, dados.novaSenha);
  revalidatePath("/perfil");
  return { ok: true };
}
