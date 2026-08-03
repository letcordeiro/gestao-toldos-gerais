import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  avisoContatos,
  avisos,
  clientes,
  fases,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";

export type Aviso = typeof avisos.$inferSelect;

export const GATILHO_LABEL: Record<Aviso["gatilho"], string> = {
  orcamento_sem_resposta: "orçamento enviado sem resposta",
  atendimento_concluido: "atendimento concluído",
};

// Variáveis aceitas na mensagem. Documentadas na tela de edição.
export const VARIAVEIS_MENSAGEM = [
  { chave: "{cliente}", descricao: "primeiro nome do cliente" },
  { chave: "{vendedor}", descricao: "primeiro nome do vendedor" },
  { chave: "{orcamento}", descricao: "número do orçamento" },
  { chave: "{avaliacao}", descricao: "link de avaliação no Google" },
] as const;

export function renderMensagem(
  template: string,
  ctx: {
    clienteNome: string;
    vendedorNome?: string | null;
    orcamentoNumero?: string | null;
  }
): string {
  return template
    .replaceAll("{cliente}", ctx.clienteNome.split(" ")[0])
    .replaceAll(
      "{vendedor}",
      ctx.vendedorNome ? ctx.vendedorNome.split(" ")[0] : "a equipe"
    )
    .replaceAll("{orcamento}", ctx.orcamentoNumero ?? "")
    .replaceAll("{avaliacao}", EMPRESA.googleReview);
}

export type PendenciaAviso = {
  // alvo do contato: orçamento ou atendimento, conforme o gatilho
  alvoId: number;
  atendimentoId: number;
  clienteNome: string;
  clienteTelefone: string;
  vendedorNome: string | null;
  orcamentoNumero: string | null;
  // quando o gatilho aconteceu (envio do orçamento / conclusão)
  desde: Date;
  linkWhatsApp: string;
};

/**
 * Pendências de um aviso: alvos que passaram do prazo e não foram dispensados.
 * "já contatei" definitivo silencia para sempre; sem re-arme, qualquer contato
 * silencia; com re-arme, o aviso volta depois de `rearmeDias`.
 */
export async function pendenciasDoAviso(
  aviso: Aviso,
  vendedorId: number | null
): Promise<PendenciaAviso[]> {
  const agora = Date.now();
  const corte = new Date(agora - aviso.dias * 24 * 60 * 60 * 1000);

  // Últimos contatos deste aviso, por alvo.
  const contatos = await db
    .select({
      alvoId: avisoContatos.alvoId,
      ultimo: sql<number>`max(${avisoContatos.contatadoEm})`,
      definitivo: sql<number>`max(${avisoContatos.definitivo})`,
    })
    .from(avisoContatos)
    .where(eq(avisoContatos.avisoId, aviso.id))
    .groupBy(avisoContatos.alvoId);
  const contatoPorAlvo = new Map(contatos.map((c) => [c.alvoId, c]));

  let candidatos: PendenciaAviso[] = [];

  if (aviso.gatilho === "orcamento_sem_resposta") {
    const linhas = await db
      .select({
        alvoId: orcamentos.id,
        atendimentoId: orcamentos.atendimentoId,
        clienteNome: clientes.nome,
        clienteTelefone: clientes.telefone,
        vendedorNome: vendedores.nome,
        orcamentoNumero: orcamentos.numero,
        desde: orcamentos.enviadoEm,
      })
      .from(orcamentos)
      .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
      .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
      .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
      .where(
        and(
          eq(clientes.ativo, true),
          eq(orcamentos.status, "enviado"),
          lte(orcamentos.enviadoEm, corte),
          vendedorId != null
            ? eq(orcamentos.vendedorId, vendedorId)
            : undefined
        )
      )
      .orderBy(asc(orcamentos.enviadoEm));
    candidatos = linhas
      .filter((l) => l.desde != null)
      .map((l) => ({ ...l, desde: l.desde as Date, linkWhatsApp: "" }));
  } else {
    const faseConcluido = await db.query.fases.findFirst({
      where: eq(fases.nome, "Concluído"),
    });
    if (!faseConcluido) return [];
    const linhas = await db
      .select({
        alvoId: atendimentos.id,
        atendimentoId: atendimentos.id,
        clienteNome: clientes.nome,
        clienteTelefone: clientes.telefone,
        vendedorNome: vendedores.nome,
        // Última entrada na fase "Concluído" registrada no histórico.
        concluidoEm: sql<number | null>`(
          select max(hf.data) from historico_fases hf
          where hf.atendimento_id = atendimentos.id
            and hf.fase_nova_id = ${faseConcluido.id}
        )`,
      })
      .from(atendimentos)
      .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
      .leftJoin(vendedores, eq(atendimentos.vendedorId, vendedores.id))
      .where(
        and(
          eq(clientes.ativo, true),
          eq(atendimentos.faseId, faseConcluido.id),
          vendedorId != null
            ? eq(atendimentos.vendedorId, vendedorId)
            : undefined
        )
      );
    candidatos = linhas
      .filter(
        (l) => l.concluidoEm != null && l.concluidoEm * 1000 <= corte.getTime()
      )
      .map((l) => ({
        alvoId: l.alvoId,
        atendimentoId: l.atendimentoId,
        clienteNome: l.clienteNome,
        clienteTelefone: l.clienteTelefone,
        vendedorNome: l.vendedorNome,
        orcamentoNumero: null,
        desde: new Date((l.concluidoEm as number) * 1000),
        linkWhatsApp: "",
      }))
      .sort((a, b) => a.desde.getTime() - b.desde.getTime());
  }

  const corteRearme =
    aviso.rearmeDias != null
      ? agora - aviso.rearmeDias * 24 * 60 * 60 * 1000
      : null;

  return candidatos
    .filter((c) => {
      const contato = contatoPorAlvo.get(c.alvoId);
      if (!contato) return true;
      if (contato.definitivo) return false;
      if (corteRearme == null) return false;
      return contato.ultimo * 1000 <= corteRearme;
    })
    .map((c) => ({
      ...c,
      linkWhatsApp: linkWhatsApp(
        c.clienteTelefone,
        renderMensagem(aviso.mensagem, {
          clienteNome: c.clienteNome,
          vendedorNome: c.vendedorNome,
          orcamentoNumero: c.orcamentoNumero,
        })
      ),
    }));
}
