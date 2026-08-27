"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { gatilhos } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";

const TIPOS = [
  "ligacao",
  "whatsapp",
  "visita",
  "proposta",
  "reuniao",
  "nota",
] as const;

const EVENTOS = [
  "entrou_na_fase",
  "orcamento_enviado",
  "orcamento_aprovado",
  "orcamento_recusado",
  "contrato_emitido",
  "contrato_assinado",
] as const;

const gatilhoSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    nome: z.string().trim().min(1, "Dê um nome à automação").max(80),
    evento: z.enum(EVENTOS),
    faseId: z
      .union([z.literal(""), z.coerce.number().int().positive()])
      .transform((v) => (v === "" ? null : v)),
    tarefaTipo: z.enum(TIPOS),
    tarefaTitulo: z
      .string()
      .trim()
      .min(1, "Escreva o título da tarefa que será criada")
      .max(120),
    tarefaPrioridade: z.enum(["baixa", "media", "alta"]),
    prazoDias: z.coerce
      .number()
      .int("Prazo deve ser um número inteiro")
      .min(0, "Prazo não pode ser negativo")
      .max(365, "Máximo de 365 dias"),
    mensagem: z
      .string()
      .trim()
      .max(2000)
      .transform((v) => v || null),
  })
  .refine((d) => d.evento !== "entrou_na_fase" || d.faseId != null, {
    message: "Escolha a fase que dispara a automação",
  });

export type GatilhoFormState = { ok?: boolean; erro?: string };

export async function salvarGatilho(
  _prev: GatilhoFormState,
  formData: FormData
): Promise<GatilhoFormState> {
  await exigirGestor();

  const parsed = gatilhoSchema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    evento: formData.get("evento"),
    faseId: formData.get("faseId") ?? "",
    tarefaTipo: formData.get("tarefaTipo") ?? "ligacao",
    tarefaTitulo: formData.get("tarefaTitulo"),
    tarefaPrioridade: formData.get("tarefaPrioridade") ?? "media",
    prazoDias: formData.get("prazoDias") ?? 0,
    mensagem: formData.get("mensagem") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  // Fase só faz sentido no evento de fase; nos outros o campo é ignorado.
  const faseId = d.evento === "entrou_na_fase" ? d.faseId : null;

  if (d.id) {
    await db
      .update(gatilhos)
      .set({
        nome: d.nome,
        evento: d.evento,
        faseId,
        tarefaTipo: d.tarefaTipo,
        tarefaTitulo: d.tarefaTitulo,
        tarefaPrioridade: d.tarefaPrioridade,
        prazoDias: d.prazoDias,
        mensagem: d.mensagem,
      })
      .where(eq(gatilhos.id, d.id));
  } else {
    await db.insert(gatilhos).values({
      nome: d.nome,
      evento: d.evento,
      faseId,
      tarefaTipo: d.tarefaTipo,
      tarefaTitulo: d.tarefaTitulo,
      tarefaPrioridade: d.tarefaPrioridade,
      prazoDias: d.prazoDias,
      mensagem: d.mensagem,
    });
  }

  revalidatePath("/cadastros/gatilhos");
  return { ok: true };
}

export async function alternarGatilho(id: number, ativo: boolean) {
  await exigirGestor();
  const gid = z.coerce.number().int().positive().parse(id);
  await db.update(gatilhos).set({ ativo }).where(eq(gatilhos.id, gid));
  revalidatePath("/cadastros/gatilhos");
}

export async function excluirGatilho(id: number) {
  await exigirGestor();
  const gid = z.coerce.number().int().positive().parse(id);
  await db.delete(gatilhos).where(eq(gatilhos.id, gid));
  revalidatePath("/cadastros/gatilhos");
}
