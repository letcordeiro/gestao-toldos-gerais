"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { headers } from "next/headers";
import { validarCredenciais, criarSessao } from "@/lib/auth";
import { LimiteTentativas, minutosRestantes } from "@/lib/limite-tentativas";

// 10 senhas erradas em 15 minutos travam aquele e-mail por 15 minutos; o IP
// tem teto maior (várias pessoas da loja podem sair do mesmo endereço).
const porEmail = new LimiteTentativas(10, 15 * 60_000, 15 * 60_000);
const porIp = new LimiteTentativas(30, 15 * 60_000, 15 * 60_000);

async function ipDaRequisicao(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "sem-ip";
}

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
  const chaveEmail = email.trim().toLowerCase();
  const ip = await ipDaRequisicao();
  const espera = Math.max(porEmail.bloqueado(chaveEmail), porIp.bloqueado(ip));
  if (espera > 0) {
    return {
      erro: `Muitas tentativas erradas. Espere ${minutosRestantes(espera)} min e tente de novo — ou use "Esqueci minha senha".`,
    };
  }
  if (!(await validarCredenciais(email, senha))) {
    porEmail.falhou(chaveEmail);
    porIp.falhou(ip);
    return { erro: "E-mail ou senha incorretos" };
  }
  porEmail.acertou(chaveEmail);

  await criarSessao(email);
  redirect("/painel");
}
