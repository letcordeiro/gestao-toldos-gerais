"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  historicoFases,
  tokensCadastro,
} from "@/db/schema";
import { exigirSessao } from "@/lib/auth";

const novoAtendimentoSchema = z
  .object({
    clienteId: z.coerce.number().int().positive().optional(),
    nome: z.string().trim().optional(),
    telefone: z.string().trim().optional(),
    email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
    endereco: z.string().trim().optional(),
    cidade: z.string().trim().optional(),
    observacoes: z.string().trim().optional(),
  })
  .refine((d) => d.clienteId || (d.nome && d.telefone), {
    message: "Escolha um cliente ou informe nome e telefone",
  });

export type NovoAtendimentoState = { erro?: string };

export async function criarAtendimento(
  _prev: NovoAtendimentoState,
  formData: FormData
): Promise<NovoAtendimentoState> {
  await exigirSessao();

  const parsed = novoAtendimentoSchema.safeParse({
    clienteId: formData.get("clienteId") || undefined,
    nome: formData.get("nome") || undefined,
    telefone: formData.get("telefone") || undefined,
    email: formData.get("email") || undefined,
    endereco: formData.get("endereco") || undefined,
    cidade: formData.get("cidade") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const faseInicial = await db.query.fases.findFirst({
    orderBy: asc(fases.ordem),
  });
  if (!faseInicial) return { erro: "Nenhuma fase cadastrada — rode o seed" };

  let clienteId = dados.clienteId;
  if (!clienteId) {
    const [novoCliente] = await db
      .insert(clientes)
      .values({
        nome: dados.nome!,
        telefone: dados.telefone!,
        email: dados.email || null,
        endereco: dados.endereco || null,
        cidade: dados.cidade || null,
        origem: "interno",
      })
      .returning({ id: clientes.id });
    clienteId = novoCliente.id;
  }

  const [novo] = await db
    .insert(atendimentos)
    .values({
      clienteId,
      faseId: faseInicial.id,
      observacoes: dados.observacoes || null,
    })
    .returning({ id: atendimentos.id });

  await db.insert(historicoFases).values({
    atendimentoId: novo.id,
    faseAnteriorId: null,
    faseNovaId: faseInicial.id,
  });

  revalidatePath("/atendimentos");
  redirect(`/atendimentos/${novo.id}`);
}

const mudarFaseSchema = z.object({
  atendimentoId: z.coerce.number().int().positive(),
  faseId: z.coerce.number().int().positive(),
});

export async function mudarFase(atendimentoId: number, faseId: number) {
  await exigirSessao();
  const parsed = mudarFaseSchema.parse({ atendimentoId, faseId });

  const atendimento = await db.query.atendimentos.findFirst({
    where: eq(atendimentos.id, parsed.atendimentoId),
  });
  if (!atendimento || atendimento.faseId === parsed.faseId) return;

  await db
    .update(atendimentos)
    .set({ faseId: parsed.faseId, atualizadoEm: new Date() })
    .where(eq(atendimentos.id, parsed.atendimentoId));

  await db.insert(historicoFases).values({
    atendimentoId: parsed.atendimentoId,
    faseAnteriorId: atendimento.faseId,
    faseNovaId: parsed.faseId,
  });

  revalidatePath("/atendimentos");
  revalidatePath(`/atendimentos/${parsed.atendimentoId}`);
}

export async function gerarLinkCadastro(): Promise<{ token: string }> {
  await exigirSessao();
  const token = nanoid(8);
  const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  await db.insert(tokensCadastro).values({ token, expiraEm });
  return { token };
}

const observacoesSchema = z.object({
  atendimentoId: z.coerce.number().int().positive(),
  observacoes: z.string().trim().max(5000),
});

export type ObservacoesState = { ok?: boolean };

export async function atualizarObservacoes(
  _prev: ObservacoesState,
  formData: FormData
): Promise<ObservacoesState> {
  await exigirSessao();
  const parsed = observacoesSchema.parse({
    atendimentoId: formData.get("atendimentoId"),
    observacoes: formData.get("observacoes") ?? "",
  });

  await db
    .update(atendimentos)
    .set({
      observacoes: parsed.observacoes || null,
      atualizadoEm: new Date(),
    })
    .where(eq(atendimentos.id, parsed.atendimentoId));

  revalidatePath(`/atendimentos/${parsed.atendimentoId}`);
  return { ok: true };
}
