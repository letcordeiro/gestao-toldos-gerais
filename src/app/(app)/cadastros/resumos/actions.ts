"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { resumos } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";
import { BLOCOS, MAX_DESTINATARIOS } from "@/lib/resumo";
import { enviarResumo } from "@/lib/resumo-envio";

const CHAVES = BLOCOS.map((b) => b.chave) as [string, ...string[]];

const destinatarioSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  tipo: z.enum(["para", "copia", "oculta"]),
});

const resumoSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    nome: z.string().trim().min(1, "Dê um nome ao resumo").max(80),
    frequencia: z.enum(["diario", "semanal", "quinzenal", "mensal"]),
    blocos: z.array(z.enum(CHAVES)).min(1, "Escolha pelo menos um bloco"),
    destinatarios: z
      .array(destinatarioSchema)
      .min(1, "Informe pelo menos um destinatário")
      .max(MAX_DESTINATARIOS, `No máximo ${MAX_DESTINATARIOS} destinatários`),
    mensagem: z
      .string()
      .trim()
      .max(1000)
      .transform((v) => v || null),
  })
  .refine((d) => d.destinatarios.some((x) => x.tipo === "para"), {
    message: "Pelo menos um destinatário precisa estar em “Para”",
  });

export type ResumoFormState = { ok?: boolean; erro?: string };

export async function salvarResumo(
  _prev: ResumoFormState,
  formData: FormData
): Promise<ResumoFormState> {
  await exigirGestor();

  // Blocos vêm como checkboxes de mesmo nome; destinatários como um JSON só
  // (a lista é dinâmica na tela).
  let destinatarios: unknown = [];
  try {
    destinatarios = JSON.parse(String(formData.get("destinatarios") ?? "[]"));
  } catch {
    return { erro: "Lista de destinatários inválida" };
  }

  const parsed = resumoSchema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    frequencia: formData.get("frequencia") ?? "diario",
    blocos: formData.getAll("blocos").map(String),
    destinatarios,
    mensagem: formData.get("mensagem") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  const valores = {
    nome: d.nome,
    frequencia: d.frequencia,
    blocos: JSON.stringify(d.blocos),
    destinatarios: JSON.stringify(d.destinatarios),
    mensagem: d.mensagem,
  };

  if (d.id) {
    await db.update(resumos).set(valores).where(eq(resumos.id, d.id));
  } else {
    await db.insert(resumos).values(valores);
  }

  revalidatePath("/cadastros/resumos");
  return { ok: true };
}

export async function alternarResumo(id: number, ativo: boolean) {
  await exigirGestor();
  const rid = z.coerce.number().int().positive().parse(id);
  await db.update(resumos).set({ ativo }).where(eq(resumos.id, rid));
  revalidatePath("/cadastros/resumos");
}

export async function excluirResumo(id: number) {
  await exigirGestor();
  const rid = z.coerce.number().int().positive().parse(id);
  await db.delete(resumos).where(eq(resumos.id, rid));
  revalidatePath("/cadastros/resumos");
}

/** "Enviar agora": ignora a frequência para dar para testar na hora. */
export async function enviarResumoAgora(
  id: number
): Promise<{ erro?: string; ok?: boolean }> {
  await exigirGestor();
  const rid = z.coerce.number().int().positive().parse(id);
  try {
    const r = await enviarResumo(rid, true);
    revalidatePath("/cadastros/resumos");
    return r.enviado ? { ok: true } : { erro: r.motivo ?? "não enviado" };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "falha no envio" };
  }
}
