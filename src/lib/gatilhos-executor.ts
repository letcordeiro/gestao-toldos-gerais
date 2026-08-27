import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  contratos,
  gatilhos,
  orcamentos,
  tarefas,
  vendedores,
} from "@/db/schema";
import { renderMensagem } from "@/lib/avisos";
import { dataDoPrazo } from "@/lib/tarefas";
import type { EventoGatilho } from "@/lib/gatilhos";

export type Gatilho = typeof gatilhos.$inferSelect;

type Contexto = {
  atendimentoId: number;
  orcamentoId?: number | null;
  contratoId?: number | null;
  // Só para "entrou_na_fase".
  faseId?: number | null;
};

/**
 * Roda as regras de um evento e cria as tarefas correspondentes.
 *
 * Silencioso de propósito: nenhuma automação pode derrubar a ação que o
 * usuário pediu. Se o gatilho falhar, a mudança de fase (ou o envio do
 * orçamento) continua valendo — só a tarefa não nasce.
 */
export async function dispararGatilhos(
  evento: EventoGatilho,
  ctx: Contexto
): Promise<number> {
  try {
    const regras = await db
      .select()
      .from(gatilhos)
      .where(
        and(
          eq(gatilhos.ativo, true),
          eq(gatilhos.evento, evento),
          // "entrou_na_fase" filtra pela fase; os outros eventos ignoram o campo.
          evento === "entrou_na_fase" && ctx.faseId != null
            ? or(eq(gatilhos.faseId, ctx.faseId), isNull(gatilhos.faseId))
            : undefined
        )
      );
    if (regras.length === 0) return 0;

    const [dados] = await db
      .select({
        clienteNome: clientes.nome,
        clienteTelefone: clientes.telefone,
        vendedorId: atendimentos.vendedorId,
        vendedorNome: vendedores.nome,
      })
      .from(atendimentos)
      .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
      .leftJoin(vendedores, eq(atendimentos.vendedorId, vendedores.id))
      .where(eq(atendimentos.id, ctx.atendimentoId));
    if (!dados) return 0;

    let numero: string | null = null;
    if (ctx.orcamentoId) {
      const orc = await db.query.orcamentos.findFirst({
        where: eq(orcamentos.id, ctx.orcamentoId),
      });
      numero = orc?.numero ?? null;
    } else if (ctx.contratoId) {
      const ct = await db.query.contratos.findFirst({
        where: eq(contratos.id, ctx.contratoId),
      });
      numero = ct?.numero ?? null;
    }

    let criadas = 0;
    for (const regra of regras) {
      // Já existe uma tarefa PENDENTE desta regra para este atendimento?
      // Sem isso, voltar e avançar a fase encheria a lista de repetidas.
      const jaTem = await db.query.tarefas.findFirst({
        where: and(
          eq(tarefas.gatilhoId, regra.id),
          eq(tarefas.atendimentoId, ctx.atendimentoId),
          eq(tarefas.status, "pendente")
        ),
      });
      if (jaTem) continue;

      await db.insert(tarefas).values({
        tipo: regra.tarefaTipo,
        titulo: regra.tarefaTitulo,
        descricao: `Criada pela automação "${regra.nome}".`,
        atendimentoId: ctx.atendimentoId,
        orcamentoId: ctx.orcamentoId ?? null,
        contratoId: ctx.contratoId ?? null,
        responsavelId: dados.vendedorId ?? null,
        prioridade: regra.tarefaPrioridade,
        previstaEm: dataDoPrazo(regra.prazoDias),
        mensagem: regra.mensagem
          ? renderMensagem(regra.mensagem, {
              clienteNome: dados.clienteNome,
              vendedorNome: dados.vendedorNome,
              orcamentoNumero: numero,
            })
          : null,
        gatilhoId: regra.id,
        criadoPor: "automação",
      });
      criadas++;
    }
    return criadas;
  } catch {
    // Automação nunca quebra a ação principal.
    return 0;
  }
}
