import { and, asc, eq, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import { atendimentos, clientes, tarefas, vendedores } from "@/db/schema";
import type { TarefaLinha } from "@/app/(app)/tarefas/lista-tarefas";

const responsavel = alias(vendedores, "responsavel");

/**
 * Linhas de tarefa já com cliente e responsável — o formato que a lista
 * espera. Uma consulta só, usada no painel, na tela de Tarefas e no
 * atendimento; assim as três mostram exatamente a mesma coisa.
 */
export async function buscarTarefas(filtros: {
  // Vendedor: só as dele (responsável OU tarefa do atendimento dele).
  vendedorId?: number | null;
  atendimentoId?: number;
  apenasPendentes?: boolean;
}): Promise<TarefaLinha[]> {
  const where: (SQL | undefined)[] = [];
  if (filtros.apenasPendentes) where.push(eq(tarefas.status, "pendente"));
  if (filtros.atendimentoId)
    where.push(eq(tarefas.atendimentoId, filtros.atendimentoId));
  if (filtros.vendedorId != null) {
    where.push(
      or(
        eq(tarefas.responsavelId, filtros.vendedorId),
        eq(atendimentos.vendedorId, filtros.vendedorId)
      )
    );
  }

  const linhas = await db
    .select({
      id: tarefas.id,
      titulo: tarefas.titulo,
      tipo: tarefas.tipo,
      prioridade: tarefas.prioridade,
      descricao: tarefas.descricao,
      previstaEm: tarefas.previstaEm,
      responsavelId: tarefas.responsavelId,
      status: tarefas.status,
      mensagem: tarefas.mensagem,
      gatilhoId: tarefas.gatilhoId,
      atendimentoId: tarefas.atendimentoId,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      responsavelNome: responsavel.nome,
    })
    .from(tarefas)
    .leftJoin(atendimentos, eq(tarefas.atendimentoId, atendimentos.id))
    .leftJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(responsavel, eq(tarefas.responsavelId, responsavel.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(tarefas.previstaEm), asc(tarefas.id));

  return linhas.map((l) => ({
    ...l,
    automatica: l.gatilhoId != null,
  }));
}

/** Quantas tarefas pendentes já venceram (inclui hoje) — o número do painel. */
export async function contarTarefasDoDia(vendedorId: number | null) {
  const linhas = await buscarTarefas({ vendedorId, apenasPendentes: true });
  const fim = new Date();
  fim.setHours(23, 59, 59, 999);
  return linhas.filter((t) => t.previstaEm != null && t.previstaEm <= fim)
    .length;
}
