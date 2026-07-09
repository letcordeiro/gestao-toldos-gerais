"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { validarCredenciais, criarSessao } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

export type LoginState = { erro?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }

  const { email, senha } = parsed.data;
  if (!(await validarCredenciais(email, senha))) {
    return { erro: "E-mail ou senha incorretos" };
  }

  await criarSessao(email);
  redirect("/painel");
}
