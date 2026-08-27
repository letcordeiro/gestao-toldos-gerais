"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cotacaoFornecedores, fornecedores } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";

const schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Informe o nome do fornecedor").max(120),
  contato: z.string().trim().max(120).transform((v) => v || null),
  telefone: z.string().trim().max(30).transform((v) => v || null),
  email: z
    .union([z.literal(""), z.string().trim().email("E-mail inválido")])
    .transform((v) => v || null),
  fornece: z.string().trim().max(200).transform((v) => v || null),
  observacoes: z.string().trim().max(2000).transform((v) => v || null),
});

export type FornecedorFormState = { ok?: boolean; erro?: string };

export async function salvarFornecedor(
  _prev: FornecedorFormState,
  formData: FormData
): Promise<FornecedorFormState> {
  await exigirGestor();
  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    contato: formData.get("contato") ?? "",
    telefone: formData.get("telefone") ?? "",
    email: formData.get("email") ?? "",
    fornece: formData.get("fornece") ?? "",
    observacoes: formData.get("observacoes") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const { id, ...valores } = parsed.data;

  if (id) await db.update(fornecedores).set(valores).where(eq(fornecedores.id, id));
  else await db.insert(fornecedores).values(valores);

  revalidatePath("/cadastros/fornecedores");
  return { ok: true };
}

export async function alternarFornecedor(id: number, ativo: boolean) {
  await exigirGestor();
  const fid = z.coerce.number().int().positive().parse(id);
  await db.update(fornecedores).set({ ativo }).where(eq(fornecedores.id, fid));
  revalidatePath("/cadastros/fornecedores");
}

export async function excluirFornecedor(id: number): Promise<{ erro?: string }> {
  await exigirGestor();
  const fid = z.coerce.number().int().positive().parse(id);

  // Fornecedor que já participou de cotação não some: a comparação ficaria
  // sem legenda. Para tirar de circulação, é o botão de ativo/inativo.
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(cotacaoFornecedores)
    .where(eq(cotacaoFornecedores.fornecedorId, fid));
  if (n > 0) {
    return {
      erro: `Já participou de ${n} cotação(ões). Desative em vez de excluir.`,
    };
  }

  await db.delete(fornecedores).where(eq(fornecedores.id, fid));
  revalidatePath("/cadastros/fornecedores");
  return {};
}
