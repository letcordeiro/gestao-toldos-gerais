"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { atendimentos, clientes, vendedores, visitas } from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import { enderecoCompleto } from "@/lib/endereco";

const visitaSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  atendimentoId: z.coerce.number().int().positive(),
  // <input type="datetime-local"> manda "2026-09-01T09:00"
  inicio: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Informe data e hora"),
  duracaoMin: z.coerce.number().int().min(15).max(600),
  endereco: z.string().trim().max(300).transform((v) => v || null),
  observacoes: z.string().trim().max(2000).transform((v) => v || null),
  vendedorId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v)),
});

export type VisitaFormState = { ok?: boolean; erro?: string };

function paraData(local: string): Date {
  // "2026-09-01T09:00" no fuso de quem digitou — que é o fuso da obra.
  const [data, hora] = local.split("T");
  const [a, m, d] = data.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return new Date(a, m - 1, d, h, min);
}

export async function salvarVisita(
  _prev: VisitaFormState,
  formData: FormData
): Promise<VisitaFormState> {
  const usuario = await exigirUsuario();

  const parsed = visitaSchema.safeParse({
    id: formData.get("id") || undefined,
    atendimentoId: formData.get("atendimentoId"),
    inicio: formData.get("inicio"),
    duracaoMin: formData.get("duracaoMin") ?? 60,
    endereco: formData.get("endereco") ?? "",
    observacoes: formData.get("observacoes") ?? "",
    vendedorId: formData.get("vendedorId") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  const valores = {
    inicioEm: paraData(d.inicio),
    duracaoMin: d.duracaoMin,
    endereco: d.endereco,
    observacoes: d.observacoes,
    vendedorId: d.vendedorId ?? usuario.vendedorId ?? null,
  };

  if (d.id) {
    await db.update(visitas).set(valores).where(eq(visitas.id, d.id));
  } else {
    await db.insert(visitas).values({
      atendimentoId: d.atendimentoId,
      ...valores,
      criadoPor: usuario.nome ?? usuario.email,
    });
  }

  revalidar(d.atendimentoId);
  return { ok: true };
}

export async function mudarSituacaoVisita(
  visitaId: number,
  situacao: string
): Promise<{ erro?: string }> {
  await exigirUsuario();
  const id = z.coerce.number().int().positive().parse(visitaId);
  const nova = z
    .enum(["agendada", "confirmada", "realizada", "cancelada", "nao_compareceu"])
    .parse(situacao);

  const visita = await db.query.visitas.findFirst({ where: eq(visitas.id, id) });
  if (!visita) return { erro: "Visita não encontrada" };

  await db.update(visitas).set({ situacao: nova }).where(eq(visitas.id, id));
  revalidar(visita.atendimentoId);
  return {};
}

export async function excluirVisita(visitaId: number) {
  await exigirUsuario();
  const id = z.coerce.number().int().positive().parse(visitaId);
  const visita = await db.query.visitas.findFirst({ where: eq(visitas.id, id) });
  await db.delete(visitas).where(eq(visitas.id, id));
  if (visita) revalidar(visita.atendimentoId);
}

/** Endereço do cliente, para já vir preenchido ao agendar. */
export async function enderecoDoAtendimento(
  atendimentoId: number
): Promise<string> {
  await exigirUsuario();
  const id = z.coerce.number().int().positive().parse(atendimentoId);
  const [linha] = await db
    .select({ cliente: clientes })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(eq(atendimentos.id, id));
  return linha ? enderecoCompleto(linha.cliente) || "" : "";
}

/** Responsáveis que podem receber uma visita. */
export async function responsaveisDeVisita() {
  const usuario = await exigirUsuario();
  if (!veFunilInteiro(usuario.papel)) return [];
  const lista = await db
    .select({ id: vendedores.id, nome: vendedores.nome, papel: vendedores.papel })
    .from(vendedores)
    .where(eq(vendedores.ativo, true))
    .orderBy(asc(vendedores.nome));
  return lista
    .filter((v) => v.papel !== "atendente")
    .map((v) => ({ id: v.id, nome: v.nome }));
}

function revalidar(atendimentoId: number) {
  revalidatePath("/visitas");
  revalidatePath("/painel");
  revalidatePath(`/atendimentos/${atendimentoId}`);
}
