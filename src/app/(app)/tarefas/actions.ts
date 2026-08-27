"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { atendimentos, tarefas } from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import { parseDataBR } from "@/lib/tarefas";

const TIPOS = [
  "ligacao",
  "whatsapp",
  "visita",
  "proposta",
  "reuniao",
  "nota",
] as const;

const tarefaSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  titulo: z.string().trim().min(1, "Escreva o que precisa ser feito").max(120),
  tipo: z.enum(TIPOS),
  prioridade: z.enum(["baixa", "media", "alta"]),
  descricao: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || null),
  // "" = tarefa sem prazo
  prevista: z
    .string()
    .trim()
    .transform((v) => (v ? parseDataBR(v) : null)),
  atendimentoId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v)),
  orcamentoId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v)),
  contratoId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v)),
  responsavelId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v)),
});

export type TarefaFormState = { ok?: boolean; erro?: string };

/** Quem pode mexer nesta tarefa: gestor/atendente em qualquer uma; vendedor só nas dele. */
async function podeMexer(tarefaId: number) {
  const usuario = await exigirUsuario();
  if (veFunilInteiro(usuario.papel)) return usuario;
  const t = await db.query.tarefas.findFirst({ where: eq(tarefas.id, tarefaId) });
  if (!t) return null;
  if (t.responsavelId != null && t.responsavelId === usuario.vendedorId)
    return usuario;
  // Tarefa sem responsável de um atendimento do vendedor também é dele.
  if (t.atendimentoId != null) {
    const at = await db.query.atendimentos.findFirst({
      where: eq(atendimentos.id, t.atendimentoId),
    });
    if (at?.vendedorId === usuario.vendedorId) return usuario;
  }
  return null;
}

export async function salvarTarefa(
  _prev: TarefaFormState,
  formData: FormData
): Promise<TarefaFormState> {
  const usuario = await exigirUsuario();

  const parsed = tarefaSchema.safeParse({
    id: formData.get("id") || undefined,
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo") ?? "ligacao",
    prioridade: formData.get("prioridade") ?? "media",
    descricao: formData.get("descricao") ?? "",
    prevista: formData.get("prevista") ?? "",
    atendimentoId: formData.get("atendimentoId") ?? "",
    orcamentoId: formData.get("orcamentoId") ?? "",
    contratoId: formData.get("contratoId") ?? "",
    responsavelId: formData.get("responsavelId") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.id) {
    if (!(await podeMexer(d.id))) return { erro: "Esta tarefa não é sua." };
    await db
      .update(tarefas)
      .set({
        titulo: d.titulo,
        tipo: d.tipo,
        prioridade: d.prioridade,
        descricao: d.descricao,
        previstaEm: d.prevista,
        responsavelId: d.responsavelId,
      })
      .where(eq(tarefas.id, d.id));
  } else {
    await db.insert(tarefas).values({
      titulo: d.titulo,
      tipo: d.tipo,
      prioridade: d.prioridade,
      descricao: d.descricao,
      previstaEm: d.prevista,
      atendimentoId: d.atendimentoId,
      orcamentoId: d.orcamentoId,
      contratoId: d.contratoId,
      // Sem responsável escolhido, a tarefa é de quem criou.
      responsavelId: d.responsavelId ?? usuario.vendedorId ?? null,
      criadoPor: usuario.nome ?? usuario.email,
    });
  }

  revalidar(d.atendimentoId);
  return { ok: true };
}

/** Marca como concluída (ou volta para pendente, se o clique foi engano). */
export async function alternarTarefa(tarefaId: number, concluir: boolean) {
  const id = z.coerce.number().int().positive().parse(tarefaId);
  if (!(await podeMexer(id))) return;

  const t = await db.query.tarefas.findFirst({ where: eq(tarefas.id, id) });
  await db
    .update(tarefas)
    .set({
      status: concluir ? "concluida" : "pendente",
      concluidaEm: concluir ? new Date() : null,
    })
    .where(eq(tarefas.id, id));

  revalidar(t?.atendimentoId ?? null);
}

export async function excluirTarefa(tarefaId: number) {
  const id = z.coerce.number().int().positive().parse(tarefaId);
  if (!(await podeMexer(id))) return;
  const t = await db.query.tarefas.findFirst({ where: eq(tarefas.id, id) });
  await db.delete(tarefas).where(eq(tarefas.id, id));
  revalidar(t?.atendimentoId ?? null);
}

/** Empurra o prazo em N dias a partir de hoje — o "deixa para depois". */
export async function adiarTarefa(tarefaId: number, dias: number) {
  const id = z.coerce.number().int().positive().parse(tarefaId);
  const n = z.coerce.number().int().min(1).max(365).parse(dias);
  if (!(await podeMexer(id))) return;

  const nova = new Date();
  nova.setHours(0, 0, 0, 0);
  nova.setDate(nova.getDate() + n);

  const t = await db.query.tarefas.findFirst({ where: eq(tarefas.id, id) });
  await db
    .update(tarefas)
    .set({ previstaEm: nova, status: "pendente", concluidaEm: null })
    .where(eq(tarefas.id, id));
  revalidar(t?.atendimentoId ?? null);
}

function revalidar(atendimentoId: number | null) {
  revalidatePath("/tarefas");
  revalidatePath("/painel");
  if (atendimentoId) revalidatePath(`/atendimentos/${atendimentoId}`);
}

/** Tarefas pendentes de um atendimento — usado na tela do atendimento. */
export async function tarefasDoAtendimento(atendimentoId: number) {
  await exigirUsuario();
  const id = z.coerce.number().int().positive().parse(atendimentoId);
  return db
    .select()
    .from(tarefas)
    .where(and(eq(tarefas.atendimentoId, id), eq(tarefas.status, "pendente")));
}
