"use server";

import { revalidatePath } from "next/cache";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { atendimentos, clientes } from "@/db/schema";
import { exigirSessao } from "@/lib/auth";

const clienteSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Informe o nome"),
  telefone: z.string().trim().min(1, "Informe o telefone"),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  endereco: z.string().trim().optional(),
  numero: z.string().trim().optional(),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  cep: z.string().trim().optional(),
});

export type ClienteFormState = { erro?: string; ok?: boolean };

export async function salvarCliente(
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  await exigirSessao();

  const parsed = clienteSchema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    email: formData.get("email") || undefined,
    endereco: formData.get("endereco") || undefined,
    numero: formData.get("numero") || undefined,
    complemento: formData.get("complemento") || undefined,
    bairro: formData.get("bairro") || undefined,
    cidade: formData.get("cidade") || undefined,
    cep: formData.get("cep") || undefined,
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const valores = {
    nome: dados.nome,
    telefone: dados.telefone,
    email: dados.email || null,
    endereco: dados.endereco || null,
    numero: dados.numero || null,
    complemento: dados.complemento || null,
    bairro: dados.bairro || null,
    cidade: dados.cidade || null,
    cep: dados.cep || null,
  };

  if (dados.id) {
    await db.update(clientes).set(valores).where(eq(clientes.id, dados.id));
  } else {
    await db.insert(clientes).values(valores);
  }

  revalidatePath("/cadastros/clientes");
  revalidatePath("/atendimentos");
  return { ok: true };
}

export async function excluirCliente(id: number): Promise<{ erro?: string }> {
  await exigirSessao();
  const clienteId = z.coerce.number().int().positive().parse(id);

  const [{ total }] = await db
    .select({ total: count() })
    .from(atendimentos)
    .where(eq(atendimentos.clienteId, clienteId));

  if (total > 0) {
    return {
      erro: `Cliente tem ${total} atendimento(s) e não pode ser excluído.`,
    };
  }

  await db.delete(clientes).where(eq(clientes.id, clienteId));
  revalidatePath("/cadastros/clientes");
  return {};
}
