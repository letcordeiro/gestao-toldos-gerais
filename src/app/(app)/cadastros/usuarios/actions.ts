"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import { vendedores } from "@/db/schema";
import { definirSenhaVendedor, exigirGestor } from "@/lib/auth";

const vendedorSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    nome: z.string().trim().min(1, "Informe o nome"),
    whatsapp: z.string().trim().optional(),
    telefoneFixo: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .email("E-mail inválido")
      .optional()
      .or(z.literal("")),
    papel: z.enum(["gestor", "atendente", "vendedor"]).default("vendedor"),
    senha: z.string().optional(),
  })
  .refine((d) => !d.senha || d.senha.length >= 6, {
    message: "A senha de acesso precisa ter ao menos 6 caracteres",
    path: ["senha"],
  })
  .refine((d) => !d.senha || (d.email && d.email.length > 0), {
    message: "Para dar acesso ao vendedor, informe o e-mail dele",
    path: ["senha"],
  });

export type VendedorFormState = { erro?: string; ok?: boolean };

export async function salvarVendedor(
  _prev: VendedorFormState,
  formData: FormData
): Promise<VendedorFormState> {
  await exigirGestor();

  const parsed = vendedorSchema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    whatsapp: formData.get("whatsapp") || undefined,
    telefoneFixo: formData.get("telefoneFixo") || undefined,
    email: formData.get("email") || undefined,
    papel: formData.get("papel") || undefined,
    senha: formData.get("senha") || undefined,
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const valores = {
    nome: dados.nome,
    whatsapp: dados.whatsapp || null,
    telefoneFixo: dados.telefoneFixo || null,
    email: dados.email || null,
    papel: dados.papel,
  };

  let vendedorId: number;
  if (dados.id) {
    await db.update(vendedores).set(valores).where(eq(vendedores.id, dados.id));
    vendedorId = dados.id;
  } else {
    const [novo] = await db
      .insert(vendedores)
      .values({ ...valores, linkToken: nanoid(10) })
      .returning({ id: vendedores.id });
    vendedorId = novo.id;
  }

  // Só troca a senha se foi digitada (deixa em branco = mantém a atual)
  if (dados.senha) {
    await definirSenhaVendedor(vendedorId, dados.senha);
  }

  revalidatePath("/cadastros/usuarios");
  return { ok: true };
}

/**
 * Gestor redefine a senha de um usuário sem precisar da senha antiga — é a
 * saída para quem esqueceu. Sem e-mail não há login, então não há o que
 * redefinir. Senha vazia REMOVE o acesso.
 */
export async function redefinirSenhaUsuario(
  id: number,
  senha: string
): Promise<{ erro?: string; ok?: boolean }> {
  const gestor = await exigirGestor();
  const usuarioId = z.coerce.number().int().positive().parse(id);
  const nova = z.string().max(100).parse(senha).trim();

  const alvo = await db.query.vendedores.findFirst({
    where: eq(vendedores.id, usuarioId),
  });
  if (!alvo) return { erro: "Usuário não encontrado" };
  if (nova && !alvo.email?.trim()) {
    return { erro: "Cadastre o e-mail do usuário antes de dar acesso." };
  }
  if (nova && nova.length < 6) {
    return { erro: "A senha precisa ter ao menos 6 caracteres." };
  }
  // Evita o gestor se trancar para fora tirando o próprio acesso.
  if (!nova && alvo.email && alvo.email === gestor.email) {
    return { erro: "Você não pode remover o próprio acesso." };
  }

  await definirSenhaVendedor(usuarioId, nova);
  revalidatePath("/cadastros/usuarios");
  return { ok: true };
}

export async function alternarAtivoVendedor(id: number, ativo: boolean) {
  await exigirGestor();
  await db
    .update(vendedores)
    .set({ ativo })
    .where(eq(vendedores.id, z.coerce.number().int().positive().parse(id)));
  revalidatePath("/cadastros/usuarios");
}
