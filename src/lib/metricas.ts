import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  historicoFases,
  motivosPerda,
  orcamentos,
  tarefas,
  vendedores,
} from "@/db/schema";

/** Soma dos itens de um orçamento (usa o valor mínimo das faixas). */
const valorDoOrcamento = sql<number>`coalesce((
  select sum(oi.valor_min)
  from orcamento_itens oi
  where oi.orcamento_id = orcamentos.id
), 0)`;

export type MetricasFunil = {
  // Fechados ÷ (fechados + perdidos), em %. null quando não houve desfecho.
  conversao: number | null;
  ganhos: number;
  perdidos: number;
  // Média do valor dos orçamentos aprovados, em centavos.
  ticketMedio: number | null;
  // Dias entre a criação do atendimento e a entrada na fase de fechamento.
  cicloMedioDias: number | null;
};

/**
 * Números do funil no período inteiro. Tudo sai de `historico_fases` e
 * `orcamentos` — nenhuma tabela nova precisou existir para isso.
 */
export async function metricasDoFunil(
  vendedorId: number | null
): Promise<MetricasFunil> {
  const escopo = vendedorId != null ? eq(atendimentos.vendedorId, vendedorId) : undefined;

  const todasFases = await db.select().from(fases);
  const idsFechamento = todasFases.filter((f) => f.liberaInstalacao).map((f) => f.id);
  const idsPerdido = todasFases.filter((f) => f.ehPerdido).map((f) => f.id);

  const linhas = await db
    .select({
      id: atendimentos.id,
      faseId: atendimentos.faseId,
      criadoEm: atendimentos.criadoEm,
    })
    .from(atendimentos)
    .where(escopo);

  const ganhos = linhas.filter((l) => idsFechamento.includes(l.faseId)).length;
  const perdidos = linhas.filter((l) => idsPerdido.includes(l.faseId)).length;
  const desfechos = ganhos + perdidos;

  // Ticket médio dos orçamentos aprovados.
  const escopoOrc =
    vendedorId != null ? eq(orcamentos.vendedorId, vendedorId) : undefined;
  const [ticket] = await db
    .select({
      n: sql<number>`count(*)`,
      soma: sql<number>`coalesce(sum(${valorDoOrcamento}), 0)`,
    })
    .from(orcamentos)
    .where(
      escopoOrc
        ? and(eq(orcamentos.status, "aprovado"), escopoOrc)
        : eq(orcamentos.status, "aprovado")
    );

  // Ciclo de venda: da abertura do atendimento até a entrada na fase que
  // fecha o negócio. Só conta quem chegou lá.
  let cicloMedioDias: number | null = null;
  if (idsFechamento.length > 0) {
    const fechamentos = await db
      .select({
        atendimentoId: historicoFases.atendimentoId,
        data: sql<number>`min(${historicoFases.data})`,
      })
      .from(historicoFases)
      .where(
        sql`${historicoFases.faseNovaId} in (${sql.join(
          idsFechamento.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
      .groupBy(historicoFases.atendimentoId);

    const aberturaPorId = new Map(linhas.map((l) => [l.id, l.criadoEm]));
    const dias = fechamentos
      .map((f) => {
        const abertura = aberturaPorId.get(f.atendimentoId);
        if (!abertura) return null;
        return differenceInCalendarDays(new Date(f.data * 1000), abertura);
      })
      .filter((d): d is number => d != null && d >= 0);
    if (dias.length > 0) {
      cicloMedioDias = Math.round(
        dias.reduce((s, d) => s + d, 0) / dias.length
      );
    }
  }

  return {
    conversao: desfechos > 0 ? Math.round((ganhos / desfechos) * 100) : null,
    ganhos,
    perdidos,
    ticketMedio: ticket?.n ? Math.round(ticket.soma / ticket.n) : null,
    cicloMedioDias,
  };
}

/** Motivos de perda somados — o relatório que justifica o cadastro fechado. */
export async function perdasPorMotivo(vendedorId: number | null) {
  const filtros: (SQL | undefined)[] = [eq(fases.ehPerdido, true)];
  if (vendedorId != null) filtros.push(eq(atendimentos.vendedorId, vendedorId));

  const linhas = await db
    .select({
      motivo: motivosPerda.nome,
      n: sql<number>`count(*)`,
    })
    .from(atendimentos)
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .leftJoin(motivosPerda, eq(atendimentos.motivoPerdaId, motivosPerda.id))
    .where(and(...filtros))
    .groupBy(atendimentos.motivoPerdaId)
    .orderBy(desc(sql`count(*)`));

  return linhas.map((l) => ({ motivo: l.motivo ?? "Sem motivo informado", n: l.n }));
}

export type AtendimentoParado = {
  id: number;
  clienteNome: string;
  faseNome: string;
  faseCor: string;
  vendedorNome: string | null;
  diasParado: number;
  nuncaTrabalhado: boolean;
};

/**
 * Quem está esquecido: sem nenhuma mudança de fase desde a abertura
 * ("nunca trabalhado") ou parado há mais de `diasLimite` dias. Fases
 * terminais ficam de fora — negócio encerrado não está esquecido.
 */
export async function atendimentosParados(
  vendedorId: number | null,
  diasLimite = 30
): Promise<AtendimentoParado[]> {
  const filtros: (SQL | undefined)[] = [
    eq(clientes.ativo, true),
    eq(fases.terminal, false),
  ];
  if (vendedorId != null) filtros.push(eq(atendimentos.vendedorId, vendedorId));

  const linhas = await db
    .select({
      id: atendimentos.id,
      criadoEm: atendimentos.criadoEm,
      clienteNome: clientes.nome,
      faseNome: fases.nome,
      faseCor: fases.cor,
      vendedorNome: vendedores.nome,
    })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .leftJoin(vendedores, eq(atendimentos.vendedorId, vendedores.id))
    .where(and(...filtros));

  // Última movimentação de cada atendimento (mudança de fase ou tarefa feita).
  const movimentos = await db
    .select({
      atendimentoId: historicoFases.atendimentoId,
      ultimo: sql<number>`max(${historicoFases.data})`,
      n: sql<number>`count(*)`,
    })
    .from(historicoFases)
    .groupBy(historicoFases.atendimentoId);
  const porId = new Map(movimentos.map((m) => [m.atendimentoId, m]));

  // Uma tarefa pendente já é sinal de que alguém está cuidando.
  const comTarefa = new Set(
    (
      await db
        .select({ atendimentoId: tarefas.atendimentoId })
        .from(tarefas)
        .where(eq(tarefas.status, "pendente"))
    )
      .map((t) => t.atendimentoId)
      .filter((id): id is number => id != null)
  );

  const hoje = new Date();
  return linhas
    .map((l) => {
      const mov = porId.get(l.id);
      const desde = mov ? new Date(mov.ultimo * 1000) : l.criadoEm;
      return {
        id: l.id,
        clienteNome: l.clienteNome,
        faseNome: l.faseNome,
        faseCor: l.faseCor,
        vendedorNome: l.vendedorNome,
        diasParado: differenceInCalendarDays(hoje, desde),
        // Nunca trabalhado: entrou e ninguém mexeu — nem fase, nem tarefa.
        nuncaTrabalhado: (mov?.n ?? 0) <= 1 && !comTarefa.has(l.id),
      };
    })
    .filter(
      (a) => !comTarefa.has(a.id) && (a.diasParado >= diasLimite || a.nuncaTrabalhado)
    )
    .sort((a, b) => b.diasParado - a.diasParado);
}
