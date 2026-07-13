"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import { vendedores } from "@/db/schema";
import {
  criarSessao,
  definirSenhaVendedor,
  temNomeSobrenome,
} from "@/lib/auth";

const schema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(1, "Informe seu nome")
      .refine(temNomeSobrenome, "Informe nome e sobrenome"),
    whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido"),
    telefoneFixo: z.string().trim().optional(),
    email: z.string().trim().email("E-mail inválido"),
    senha: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
    confirmar: z.string(),
  })
  .refine((d) => d.senha === d.confirmar, {
    message: "A confirmação não confere com a senha",
    path: ["confirmar"],
  });

export type CadastroVendedorState = { erro?: string };

export async function cadastrarVendedor(
  _prev: CadastroVendedorState,
  formData: FormData
): Promise<CadastroVendedorState> {
  // Confere o token do link contra o configurado (só quem tem o link cadastra).
  const tokenOk = process.env.VENDEDOR_SIGNUP_TOKEN;
  const token = String(formData.get("token") ?? "");
  if (!tokenOk || token !== tokenOk) {
    return { erro: "Link de cadastro inválido." };
  }

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    whatsapp: formData.get("whatsapp"),
    telefoneFixo: formData.get("telefoneFixo") || undefined,
    email: formData.get("email"),
    senha: formData.get("senha"),
    confirmar: formData.get("confirmar"),
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;
  const email = dados.email.toLowerCase();

  // E-mail já cadastrado como vendedor ativo?
  const existente = await db.query.vendedores.findFirst({
    where: and(eq(vendedores.email, email), eq(vendedores.ativo, true)),
  });
  if (existente) {
    return {
      erro: "Este e-mail já tem cadastro. Faça login ou peça a senha ao gestor.",
    };
  }

  const [novo] = await db
    .insert(vendedores)
    .values({
      nome: dados.nome,
      whatsapp: dados.whatsapp,
      telefoneFixo: dados.telefoneFixo || null,
      email,
      papel: "vendedor",
      linkToken: nanoid(10),
    })
    .returning({ id: vendedores.id });

  await definirSenhaVendedor(novo.id, dados.senha);

  // Já entra logado.
  await criarSessao(email);
  redirect("/painel");
}
