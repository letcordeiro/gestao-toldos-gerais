"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { agendaBloqueios, vendedores } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { minutosDe, validarBloqueio, type Recorrencia } from "@/lib/agenda";

/**
 * Bloqueios da agenda do próprio sistema (13/10/2026).
 *
 * Quem mexe: o PRÓPRIO vendedor na agenda dele, e o gestor em qualquer uma.
 * A atendente não cria nem apaga — ela marca visita na agenda dos outros, e o
 * horário que o vendedor reservou para a vida dele não é dela para mudar.
 */
type Usuario = Awaited<ReturnType<typeof exigirUsuario>>;

function podeMexer(usuario: Usuario, vendedorId: number): boolean {
  if (usuario.papel === "gestor") return true;
  return usuario.papel === "vendedor" && usuario.vendedorId === vendedorId;
}

export type BloqueioFormState = { erro?: string; ok?: boolean };

const schema = z.object({
  vendedorId: z.coerce.number().int().positive("Escolha de quem é a agenda"),
  recorrencia: z.enum(["unico", "semanal"]),
  data: z.string().trim().transform((v) => v || null),
  diaSemana: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(6)])
    .transform((v) => (v === "" ? null : v)),
  diaInteiro: z
    .union([z.literal("on"), z.literal(""), z.null()])
    .transform((v) => v === "on"),
  inicio: z.string().trim(),
  fim: z.string().trim(),
  ate: z.string().trim().transform((v) => v || null),
  motivo: z
    .string()
    .trim()
    .max(120)
    .transform((v) => v || null),
});

export async function salvarBloqueio(
  _prev: BloqueioFormState,
  formData: FormData
): Promise<BloqueioFormState> {
  const usuario = await exigirUsuario();
  const parsed = schema.safeParse({
    vendedorId: formData.get("vendedorId") ?? usuario.vendedorId ?? "",
    recorrencia: formData.get("recorrencia") ?? "unico",
    data: formData.get("data") ?? "",
    diaSemana: formData.get("diaSemana") ?? "",
    diaInteiro: formData.get("diaInteiro") ?? "",
    inicio: formData.get("inicio") ?? "",
    fim: formData.get("fim") ?? "",
    ate: formData.get("ate") ?? "",
    motivo: formData.get("motivo") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  if (!podeMexer(usuario, d.vendedorId)) {
    return { erro: "Você só pode bloquear horários da sua própria agenda." };
  }
  const dono = await db.query.vendedores.findFirst({
    where: eq(vendedores.id, d.vendedorId),
    columns: { ativo: true, papel: true },
  });
  if (!dono || !dono.ativo || dono.papel === "atendente") {
    return { erro: "Escolha um vendedor ativo." };
  }

  const inicioMin = d.diaInteiro ? 0 : minutosDe(d.inicio);
  const fimMin = d.diaInteiro ? 24 * 60 : minutosDe(d.fim);
  if (inicioMin == null || fimMin == null) {
    return { erro: "Informe o horário (ou marque “dia inteiro”)." };
  }

  const bloqueio = {
    recorrencia: d.recorrencia as Recorrencia,
    data: d.data,
    diaSemana: d.recorrencia === "semanal" ? d.diaSemana : null,
    inicioMin,
    fimMin,
    ate: d.recorrencia === "semanal" ? d.ate : null,
  };
  const erro = validarBloqueio(bloqueio);
  if (erro) return { erro };

  await db.insert(agendaBloqueios).values({
    vendedorId: d.vendedorId,
    ...bloqueio,
    motivo: d.motivo,
    criadoPor: usuario.nome ?? usuario.email,
  });
  revalidatePath("/visitas");
  return { ok: true };
}

export async function excluirBloqueio(id: number): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario();
  const bloqueioId = z.coerce.number().int().positive().safeParse(id);
  if (!bloqueioId.success) return { erro: "Bloqueio não encontrado." };
  const atual = await db.query.agendaBloqueios.findFirst({
    where: eq(agendaBloqueios.id, bloqueioId.data),
  });
  if (!atual || !podeMexer(usuario, atual.vendedorId)) {
    return { erro: "Bloqueio não encontrado." };
  }
  await db.delete(agendaBloqueios).where(eq(agendaBloqueios.id, atual.id));
  revalidatePath("/visitas");
  return {};
}
