"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { instalacaoEquipe, instaladores, orcamentoItens } from "@/db/schema";
import { exigirComercial, exigirUsuario } from "@/lib/auth";
import { valorDaComissao } from "@/lib/comissoes";
import { registrarDinheiro } from "@/lib/log-dinheiro";
import { parseParaCentavos } from "@/lib/format";

const linhaSchema = z.object({
  orcamentoId: z.coerce.number().int().positive(),
  instaladorId: z.coerce.number().int().positive(),
  papel: z.enum(["responsavel", "ajudante"]),
  tipo: z.enum(["percentual", "fixo"]),
  percentual: z.string().trim().optional(),
  valorFixo: z.string().trim().optional(),
});

export type EquipeFormState = { ok?: boolean; erro?: string };

export async function adicionarNaEquipe(
  _prev: EquipeFormState,
  formData: FormData
): Promise<EquipeFormState> {
  await exigirComercial();

  const parsed = linhaSchema.safeParse({
    orcamentoId: formData.get("orcamentoId"),
    instaladorId: formData.get("instaladorId"),
    papel: formData.get("papel") ?? "ajudante",
    tipo: formData.get("tipo") ?? "percentual",
    percentual: formData.get("percentual") ?? "",
    valorFixo: formData.get("valorFixo") ?? "",
  });
  if (!parsed.success) return { erro: "Escolha o instalador" };
  const d = parsed.data;

  const equipe = await db
    .select()
    .from(instalacaoEquipe)
    .where(eq(instalacaoEquipe.orcamentoId, d.orcamentoId));
  if (equipe.some((e) => e.instaladorId === d.instaladorId)) {
    return { erro: "Esse instalador já está na equipe." };
  }

  const percentual = d.percentual ? Number(d.percentual.replace(",", ".")) : null;
  const valorFixo = d.valorFixo ? parseParaCentavos(d.valorFixo) : null;

  if (d.tipo === "percentual" && (percentual == null || percentual <= 0)) {
    return { erro: "Informe o percentual da comissão." };
  }
  if (d.tipo === "fixo" && (valorFixo == null || valorFixo <= 0)) {
    return { erro: "Informe o valor da comissão." };
  }

  await db.insert(instalacaoEquipe).values({
    orcamentoId: d.orcamentoId,
    instaladorId: d.instaladorId,
    papel: d.papel,
    tipo: d.tipo,
    percentual: d.tipo === "percentual" ? percentual : null,
    valorFixo: d.tipo === "fixo" ? valorFixo : null,
  });

  revalidar(d.orcamentoId);
  return { ok: true };
}

export async function removerDaEquipe(linhaId: number) {
  await exigirComercial();
  const id = z.coerce.number().int().positive().parse(linhaId);
  const linha = await db.query.instalacaoEquipe.findFirst({
    where: eq(instalacaoEquipe.id, id),
  });
  await db.delete(instalacaoEquipe).where(eq(instalacaoEquipe.id, id));
  if (linha) revalidar(linha.orcamentoId);
}

/** Baixa da comissão: marca (ou desmarca) como paga. */
export async function marcarComissaoPaga(linhaId: number, paga: boolean) {
  const usuario = await exigirUsuario();
  await exigirComercial();
  const id = z.coerce.number().int().positive().parse(linhaId);
  const linha = await db.query.instalacaoEquipe.findFirst({
    where: eq(instalacaoEquipe.id, id),
  });
  await db
    .update(instalacaoEquipe)
    .set({ pagoEm: paga ? new Date() : null })
    .where(eq(instalacaoEquipe.id, id));

  if (linha) {
    // O valor vai junto no log: sem ele, "quem deu baixa" não responde
    // "de quanto era" — que é a pergunta seguinte, sempre.
    const [instalador, soma] = await Promise.all([
      db.query.instaladores.findFirst({
        where: eq(instaladores.id, linha.instaladorId),
      }),
      db
        .select({
          total: sql<number | null>`sum(${orcamentoItens.valorMin})`,
        })
        .from(orcamentoItens)
        .where(eq(orcamentoItens.orcamentoId, linha.orcamentoId)),
    ]);
    await registrarDinheiro({
      acao: paga ? "comissao_paga" : "comissao_desfeita",
      usuario: usuario.nome ?? usuario.email,
      descricao: `Comissão de ${instalador?.nome ?? "instalador"}`,
      valor: valorDaComissao(linha, soma[0]?.total ?? null),
      orcamentoId: linha.orcamentoId,
    });
    revalidar(linha.orcamentoId);
  }
}

/** Instaladores ativos com a comissão padrão, para montar a equipe. */
export async function instaladoresAtivos() {
  await exigirComercial();
  return db
    .select({
      id: instaladores.id,
      nome: instaladores.nome,
      comissaoPadraoPercent: instaladores.comissaoPadraoPercent,
    })
    .from(instaladores)
    .where(eq(instaladores.ativo, true));
}

function revalidar(orcamentoId: number) {
  revalidatePath(`/orcamentos/${orcamentoId}/ficha`);
  revalidatePath("/instalacoes");
}
