"use server";

import { revalidatePath } from "next/cache";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { modelosToldo, orcamentos } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";

const modeloSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Informe o nome"),
  descricaoMaterial: z.string().trim().optional(),
  fixacaoVedacao: z.string().trim().optional(),
  estruturaSempreAluminio: z.boolean(),
  usaFormato: z.boolean(),
});

export type ModeloFormState = { erro?: string; ok?: boolean };

export async function salvarModelo(
  _prev: ModeloFormState,
  formData: FormData
): Promise<ModeloFormState> {
  await exigirGestor();

  const parsed = modeloSchema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    descricaoMaterial: formData.get("descricaoMaterial") || undefined,
    fixacaoVedacao: formData.get("fixacaoVedacao") || undefined,
    estruturaSempreAluminio: formData.get("estruturaSempreAluminio") === "1",
    usaFormato: formData.get("usaFormato") === "1",
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const valores = {
    nome: dados.nome,
    descricaoMaterial: dados.descricaoMaterial || null,
    fixacaoVedacao: dados.fixacaoVedacao || null,
    estruturaSempreAluminio: dados.estruturaSempreAluminio,
    usaFormato: dados.usaFormato,
  };

  if (dados.id) {
    await db
      .update(modelosToldo)
      .set(valores)
      .where(eq(modelosToldo.id, dados.id));
  } else {
    await db.insert(modelosToldo).values(valores);
  }

  revalidatePath("/cadastros/modelos");
  return { ok: true };
}

export async function alternarAtivo(id: number, ativo: boolean) {
  await exigirGestor();
  await db
    .update(modelosToldo)
    .set({ ativo })
    .where(eq(modelosToldo.id, z.coerce.number().int().positive().parse(id)));
  revalidatePath("/cadastros/modelos");
}

export async function excluirModelo(id: number): Promise<{ erro?: string }> {
  await exigirGestor();
  const modeloId = z.coerce.number().int().positive().parse(id);

  // Trava: não excluir modelo já usado em algum orçamento.
  const [{ total }] = await db
    .select({ total: count() })
    .from(orcamentos)
    .where(eq(orcamentos.modeloId, modeloId));
  if (total > 0) {
    return {
      erro: `Modelo em uso por ${total} orçamento(s). Desative-o em vez de excluir.`,
    };
  }

  await db.delete(modelosToldo).where(eq(modelosToldo.id, modeloId));
  revalidatePath("/cadastros/modelos");
  return {};
}
