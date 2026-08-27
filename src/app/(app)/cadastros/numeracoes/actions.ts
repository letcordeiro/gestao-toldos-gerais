"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { numeracoes } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";

const schema = z.object({
  documento: z.enum(["orcamento", "contrato"]),
  // Só letra, número e hífen: prefixo com espaço ou acento quebra busca e
  // vira dor de cabeça em nome de arquivo.
  prefixo: z
    .string()
    .trim()
    .max(10, "Máximo de 10 caracteres")
    .regex(/^[A-Za-z0-9-]*$/, "Use só letras, números e hífen")
    .transform((v) => v.toUpperCase()),
  incluiAno: z
    .union([z.literal("on"), z.literal("true"), z.null(), z.literal("")])
    .transform((v) => v === "on" || v === "true"),
  digitos: z.coerce
    .number()
    .int()
    .min(1, "No mínimo 1 dígito")
    .max(10, "No máximo 10 dígitos"),
});

export type NumeracaoFormState = { ok?: boolean; erro?: string };

export async function salvarNumeracao(
  _prev: NumeracaoFormState,
  formData: FormData
): Promise<NumeracaoFormState> {
  await exigirGestor();

  const parsed = schema.safeParse({
    documento: formData.get("documento"),
    prefixo: formData.get("prefixo") ?? "",
    incluiAno: formData.get("incluiAno"),
    digitos: formData.get("digitos") ?? 3,
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const { documento, ...valores } = parsed.data;

  const existente = await db.query.numeracoes.findFirst({
    where: eq(numeracoes.documento, documento),
  });
  if (existente) {
    await db
      .update(numeracoes)
      .set(valores)
      .where(eq(numeracoes.documento, documento));
  } else {
    await db.insert(numeracoes).values({ documento, ...valores });
  }

  revalidatePath("/cadastros/numeracoes");
  return { ok: true };
}
