"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { modelosToldo } from "@/db/schema";
import { exigirSessao } from "@/lib/auth";

const modeloSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Informe o nome"),
  descricaoMaterial: z.string().trim().optional(),
  estruturaAluminio: z.string().trim().optional(),
  estruturaFerro: z.string().trim().optional(),
  fixacaoVedacao: z.string().trim().optional(),
});

export type ModeloFormState = { erro?: string; ok?: boolean };

export async function salvarModelo(
  _prev: ModeloFormState,
  formData: FormData
): Promise<ModeloFormState> {
  await exigirSessao();

  const parsed = modeloSchema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    descricaoMaterial: formData.get("descricaoMaterial") || undefined,
    estruturaAluminio: formData.get("estruturaAluminio") || undefined,
    estruturaFerro: formData.get("estruturaFerro") || undefined,
    fixacaoVedacao: formData.get("fixacaoVedacao") || undefined,
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const valores = {
    nome: dados.nome,
    descricaoMaterial: dados.descricaoMaterial || null,
    estruturaAluminio: dados.estruturaAluminio || null,
    estruturaFerro: dados.estruturaFerro || null,
    fixacaoVedacao: dados.fixacaoVedacao || null,
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
  await exigirSessao();
  await db
    .update(modelosToldo)
    .set({ ativo })
    .where(eq(modelosToldo.id, z.coerce.number().int().positive().parse(id)));
  revalidatePath("/cadastros/modelos");
}
