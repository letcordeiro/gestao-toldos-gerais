"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { instalacaoItens, orcamentoInstalacao, orcamentos } from "@/db/schema";
import { usuarioAtual } from "@/lib/auth";

// Mesma regra do resto do orçamento: vendedor só mexe no que é dele; gestor em tudo.
async function orcamentoPermitido(orcamentoId: number) {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  const orc = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
  });
  if (!orc) return null;
  if (usuario.papel === "vendedor" && orc.vendedorId !== usuario.vendedorId)
    return null;
  return orc;
}

// Data em texto (dd/mm/aaaa ou aaaa-mm-dd) -> Date. Vazio -> null.
function parseData(valor: string | undefined): Date | null {
  const v = (valor ?? "").trim();
  if (!v) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  return null;
}

const itemSchema = z.object({
  qtde: z.string().trim().optional(),
  produto: z.string().trim().optional(),
  estrutura: z.string().trim().optional(),
  revestimento: z.string().trim().optional(),
  rufo: z.string().trim().optional(),
  babado: z.string().trim().optional(),
  vies: z.string().trim().optional(),
});

const schema = z.object({
  orcamentoId: z.coerce.number().int().positive(),
  responsavel: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
  calha: z.string().trim().optional(),
  tipoEscada: z.string().trim().optional(),
  condEstacionamento: z.string().trim().optional(),
  horario: z.string().trim().optional(),
  prevEntrega: z.string().trim().optional(),
  dataEntrega: z.string().trim().optional(),
  itens: z.array(itemSchema),
});

export type InstalacaoState = { erro?: string; ok?: boolean };

export async function salvarInstalacao(
  _prev: InstalacaoState,
  formData: FormData
): Promise<InstalacaoState> {
  const itensBrutos = formData.get("itens");
  let itens: unknown = [];
  try {
    itens = JSON.parse(String(itensBrutos ?? "[]"));
  } catch {
    return { erro: "Não consegui ler as linhas de produto" };
  }

  const parsed = schema.safeParse({
    orcamentoId: formData.get("orcamentoId"),
    responsavel: formData.get("responsavel"),
    observacoes: formData.get("observacoes"),
    calha: formData.get("calha"),
    tipoEscada: formData.get("tipoEscada"),
    condEstacionamento: formData.get("condEstacionamento"),
    horario: formData.get("horario"),
    prevEntrega: formData.get("prevEntrega"),
    dataEntrega: formData.get("dataEntrega"),
    itens,
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  const orc = await orcamentoPermitido(d.orcamentoId);
  if (!orc) return { erro: "Sem permissão para este orçamento" };
  if (orc.status !== "aprovado")
    return { erro: "A ficha de instalação só vale para orçamento aprovado" };

  const valores = {
    responsavel: d.responsavel || null,
    observacoes: d.observacoes || null,
    calha: d.calha || null,
    tipoEscada: d.tipoEscada || null,
    condEstacionamento: d.condEstacionamento || null,
    horario: d.horario || null,
    prevEntrega: parseData(d.prevEntrega),
    dataEntrega: parseData(d.dataEntrega),
    atualizadoEm: new Date(),
  };

  const existente = await db.query.orcamentoInstalacao.findFirst({
    where: eq(orcamentoInstalacao.orcamentoId, d.orcamentoId),
  });
  if (existente) {
    await db
      .update(orcamentoInstalacao)
      .set(valores)
      .where(eq(orcamentoInstalacao.id, existente.id));
  } else {
    await db
      .insert(orcamentoInstalacao)
      .values({ orcamentoId: d.orcamentoId, ...valores });
  }

  // Regrava as linhas do zero (mesmo padrão dos itens do orçamento).
  await db
    .delete(instalacaoItens)
    .where(eq(instalacaoItens.orcamentoId, d.orcamentoId));
  const linhas = d.itens
    .filter((i) =>
      [i.qtde, i.produto, i.estrutura, i.revestimento, i.rufo, i.babado, i.vies]
        .some((v) => (v ?? "").trim() !== "")
    )
    .map((i, idx) => ({
      orcamentoId: d.orcamentoId,
      qtde: i.qtde || null,
      produto: i.produto || null,
      estrutura: i.estrutura || null,
      revestimento: i.revestimento || null,
      rufo: i.rufo || null,
      babado: i.babado || null,
      vies: i.vies || null,
      ordem: idx,
    }));
  if (linhas.length) await db.insert(instalacaoItens).values(linhas);

  revalidatePath(`/orcamentos/${d.orcamentoId}`);
  return { ok: true };
}
