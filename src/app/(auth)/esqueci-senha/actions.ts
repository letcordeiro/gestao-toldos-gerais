"use server";

import { z } from "zod";
import { emailReconhecido, redefinirSenhaUsuario } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  codigo: z.string().trim().min(1, "Informe o código de recuperação"),
  novaSenha: z
    .string()
    .min(6, "A nova senha precisa ter ao menos 6 caracteres"),
});

export type RecuperarState = { erro?: string; ok?: boolean };

export async function redefinirSenha(
  _prev: RecuperarState,
  formData: FormData
): Promise<RecuperarState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    codigo: formData.get("codigo"),
    novaSenha: formData.get("novaSenha"),
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const { email, codigo, novaSenha } = parsed.data;

  const codigoEsperado = process.env.RECOVERY_CODE ?? "";
  // Erro genérico: não revela se foi o e-mail ou o código que falhou.
  if (
    !codigoEsperado ||
    codigo.trim() !== codigoEsperado ||
    !(await emailReconhecido(email))
  ) {
    return { erro: "E-mail ou código de recuperação inválidos" };
  }

  await redefinirSenhaUsuario(email, novaSenha);
  return { ok: true };
}
