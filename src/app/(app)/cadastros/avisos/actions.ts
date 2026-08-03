"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { avisos } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";

const avisoSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Dê um nome ao aviso").max(80),
  gatilho: z.enum(["orcamento_sem_resposta", "atendimento_concluido"]),
  dias: z.coerce
    .number()
    .int("Dias deve ser um número inteiro")
    .min(0, "Dias não pode ser negativo")
    .max(365, "Máximo de 365 dias"),
  mensagem: z.string().trim().min(1, "Escreva a mensagem do WhatsApp").max(2000),
  // "" = não avisar de novo (dispensa definitiva); número = re-arma após N dias
  rearmeDias: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(365)])
    .transform((v) => (v === "" ? null : v)),
});

export type AvisoFormState = { ok?: boolean; erro?: string };

export async function salvarAviso(
  _prev: AvisoFormState,
  formData: FormData
): Promise<AvisoFormState> {
  await exigirGestor();

  const parsed = avisoSchema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    gatilho: formData.get("gatilho"),
    dias: formData.get("dias"),
    mensagem: formData.get("mensagem"),
    rearmeDias: formData.get("rearmeDias") ?? "",
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  if (dados.id) {
    await db
      .update(avisos)
      .set({
        nome: dados.nome,
        gatilho: dados.gatilho,
        dias: dados.dias,
        mensagem: dados.mensagem,
        rearmeDias: dados.rearmeDias,
      })
      .where(eq(avisos.id, dados.id));
  } else {
    await db.insert(avisos).values({
      nome: dados.nome,
      gatilho: dados.gatilho,
      dias: dados.dias,
      mensagem: dados.mensagem,
      rearmeDias: dados.rearmeDias,
    });
  }

  revalidatePath("/cadastros/avisos");
  revalidatePath("/atendimentos");
  return { ok: true };
}

export async function alternarAtivoAviso(id: number, ativo: boolean) {
  await exigirGestor();
  const avisoId = z.coerce.number().int().positive().parse(id);
  await db
    .update(avisos)
    .set({ ativo: Boolean(ativo) })
    .where(eq(avisos.id, avisoId));
  revalidatePath("/cadastros/avisos");
  revalidatePath("/atendimentos");
}

export async function excluirAviso(id: number): Promise<{ erro?: string }> {
  await exigirGestor();
  const avisoId = z.coerce.number().int().positive().parse(id);
  // aviso_contatos cai junto (ON DELETE CASCADE)
  await db.delete(avisos).where(eq(avisos.id, avisoId));
  revalidatePath("/cadastros/avisos");
  revalidatePath("/atendimentos");
  return {};
}
