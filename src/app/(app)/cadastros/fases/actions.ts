"use server";

import { revalidatePath } from "next/cache";
import { count, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { atendimentos, fases, gatilhos, historicoFases } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";

// Checkbox não enviado vem null; enviado vem "on".
const flag = z
  .union([z.literal("on"), z.literal("true"), z.null(), z.literal("")])
  .transform((v) => v === "on" || v === "true");

const faseSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Informe o nome"),
  ordem: z.coerce.number().int().min(1, "Ordem deve ser 1 ou maior"),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  liberaInstalacao: flag,
  exibirNaListagem: flag,
  terminal: flag,
  ehPerdido: flag,
});

export type FaseFormState = { erro?: string; ok?: boolean };

export async function salvarFase(
  _prev: FaseFormState,
  formData: FormData
): Promise<FaseFormState> {
  await exigirGestor();

  const parsed = faseSchema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    ordem: formData.get("ordem"),
    cor: formData.get("cor"),
    liberaInstalacao: formData.get("liberaInstalacao"),
    exibirNaListagem: formData.get("exibirNaListagem"),
    terminal: formData.get("terminal"),
    ehPerdido: formData.get("ehPerdido"),
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const { id, ...valores } = parsed.data;

  if (id) {
    await db.update(fases).set(valores).where(eq(fases.id, id));
  } else {
    await db.insert(fases).values(valores);
  }

  revalidatePath("/cadastros/fases");
  revalidatePath("/atendimentos");
  revalidatePath("/painel");
  return { ok: true };
}

export async function excluirFase(id: number): Promise<{ erro?: string }> {
  await exigirGestor();
  const faseId = z.coerce.number().int().positive().parse(id);

  const [{ total }] = await db
    .select({ total: count() })
    .from(atendimentos)
    .where(eq(atendimentos.faseId, faseId));

  if (total > 0) {
    return { erro: `Fase em uso por ${total} atendimento(s).` };
  }

  // Também o HISTÓRICO e as automações apontam para a fase. Antes só se
  // olhava o "agora": quase toda fase já tem histórico, o banco recusava e a
  // tela inteira caía na página de erro (auditoria de 07/10/2026).
  const [{ noHistorico }] = await db
    .select({ noHistorico: count() })
    .from(historicoFases)
    .where(or(eq(historicoFases.faseAnteriorId, faseId), eq(historicoFases.faseNovaId, faseId)));
  if (noHistorico > 0) {
    return {
      erro:
        "Esta fase já aparece no histórico dos atendimentos, então não dá para excluir. " +
        "Para tirá-la de vista, edite e desmarque “Aparece na lista de atendimentos”.",
    };
  }
  const [{ emAutomacao }] = await db
    .select({ emAutomacao: count() })
    .from(gatilhos)
    .where(eq(gatilhos.faseId, faseId));
  if (emAutomacao > 0) {
    return {
      erro: `Há ${emAutomacao} automação(ões) ligada(s) a esta fase. Mude ou exclua a automação antes.`,
    };
  }

  try {
    await db.delete(fases).where(eq(fases.id, faseId));
  } catch {
    return { erro: "Não deu para excluir a fase: ela ainda está em uso." };
  }
  revalidatePath("/cadastros/fases");
  revalidatePath("/atendimentos");
  return {};
}
