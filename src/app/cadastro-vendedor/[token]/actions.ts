"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import { vendedores } from "@/db/schema";
import {
  criarSessao,
  definirSenhaVendedor,
  emailReconhecido,
  temNomeSobrenome,
} from "@/lib/auth";

/**
 * Compara o token sem vazar, pelo tempo de resposta, quantos caracteres
 * acertou — `!==` para no primeiro diferente (auditoria de 07/10/2026). O
 * hash deixa os dois buffers do mesmo tamanho, que é o que `timingSafeEqual`
 * exige, e também esconde o tamanho do token certo.
 */
function tokenConfere(recebido: string, esperado: string): boolean {
  const a = crypto.createHash("sha256").update(recebido).digest();
  const b = crypto.createHash("sha256").update(esperado).digest();
  return crypto.timingSafeEqual(a, b);
}

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
  if (!tokenOk || !tokenConfere(token, tokenOk)) {
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

  // E-mail que já entra no sistema por QUALQUER porta não se cadastra de
  // novo. Antes só se olhava vendedor ATIVO: com o e-mail de um desativado,
  // ou de um admin do env/`usuarios`, nascia um vendedor novo com senha
  // escolhida por quem tinha o link — e, no caso do admin, a sessão passava a
  // ser a desse vendedor (auditoria de 07/10/2026). O desativado conta mesmo
  // inativo: reativar é decisão do gestor, não do link. Compara sem caixa e
  // sem espaço porque há cadastro antigo gravado do jeito que foi digitado.
  const vendedorComEmail = await db.query.vendedores.findFirst({
    where: sql`lower(trim(${vendedores.email})) = ${email}`,
    columns: { id: true },
  });
  if (vendedorComEmail || (await emailReconhecido(email))) {
    return { erro: "Este e-mail já tem acesso. Fale com o gestor." };
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
