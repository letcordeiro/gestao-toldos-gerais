import { and, asc, eq, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  orcamentoInstalacao,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { gavetaDaTarefa, type Gaveta } from "@/lib/tarefas";

export type Instalacao = {
  orcamentoId: number;
  numero: string;
  clienteNome: string;
  clienteTelefone: string;
  cidade: string | null;
  faseNome: string;
  faseCor: string;
  vendedorNome: string | null;
  responsavel: string | null;
  horario: string | null;
  prevEntrega: Date | null;
  temFicha: boolean;
  gaveta: Gaveta;
};

/**
 * O que está para instalar. Entra na lista o orçamento de negócio fechado
 * (fase com "negócio fechado") que ainda não teve a entrega registrada.
 *
 * A gaveta é a MESMA das tarefas (`gavetaDaTarefa`): vencida, hoje, amanhã,
 * próximas, sem data. Duas telas que falam de prazo devem contar o prazo do
 * mesmo jeito.
 */
export async function buscarInstalacoes(
  vendedorId: number | null
): Promise<Instalacao[]> {
  const filtros: (SQL | undefined)[] = [
    eq(clientes.ativo, true),
    // Negócio fechado: é a fase que diz isso, não o status do orçamento.
    eq(fases.liberaInstalacao, true),
    // Entrega ainda não aconteceu (ou a ficha nem foi aberta).
    or(
      isNull(orcamentoInstalacao.dataEntrega),
      isNull(orcamentoInstalacao.orcamentoId)
    ),
  ];
  if (vendedorId != null) filtros.push(eq(orcamentos.vendedorId, vendedorId));

  const linhas = await db
    .select({
      orcamentoId: orcamentos.id,
      numero: orcamentos.numero,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      cidade: clientes.cidade,
      faseNome: fases.nome,
      faseCor: fases.cor,
      vendedorNome: vendedores.nome,
      responsavel: orcamentoInstalacao.responsavel,
      horario: orcamentoInstalacao.horario,
      prevEntrega: orcamentoInstalacao.prevEntrega,
      fichaId: orcamentoInstalacao.id,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .leftJoin(
      orcamentoInstalacao,
      eq(orcamentoInstalacao.orcamentoId, orcamentos.id)
    )
    .where(and(...filtros))
    .orderBy(asc(orcamentoInstalacao.prevEntrega), asc(orcamentos.numero));

  return linhas.map((l) => ({
    orcamentoId: l.orcamentoId,
    numero: l.numero,
    clienteNome: l.clienteNome,
    clienteTelefone: l.clienteTelefone,
    cidade: l.cidade,
    faseNome: l.faseNome,
    faseCor: l.faseCor,
    vendedorNome: l.vendedorNome,
    responsavel: l.responsavel,
    horario: l.horario,
    prevEntrega: l.prevEntrega,
    temFicha: l.fichaId != null,
    gaveta: gavetaDaTarefa(l.prevEntrega),
  }));
}

/** Quantas instalações em cada gaveta — os contadores do topo da tela. */
export function contarPorGaveta(
  instalacoes: Instalacao[]
): Record<Gaveta, number> {
  const zero: Record<Gaveta, number> = {
    atrasada: 0,
    hoje: 0,
    amanha: 0,
    proximas: 0,
    sem_data: 0,
  };
  for (const i of instalacoes) zero[i.gaveta]++;
  return zero;
}

/**
 * Negócio fechado e ninguém abriu a ficha. É o furo mais caro do processo:
 * o cliente pagou e a obra não entrou na fila de ninguém.
 */
export function semFicha(instalacoes: Instalacao[]): Instalacao[] {
  return instalacoes.filter((i) => !i.temFicha);
}
