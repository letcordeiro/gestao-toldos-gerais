import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  avisoContatos,
  avisos,
  clientes,
  contratoPagamentos,
  contratos,
  fases,
  orcamentoInstalacao,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { formatarCentavos } from "@/lib/format";
import { diasDeAtraso, vencimentoEfetivo } from "@/lib/cobranca";
import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";

export type Aviso = typeof avisos.$inferSelect;

export const GATILHO_LABEL: Record<Aviso["gatilho"], string> = {
  orcamento_sem_resposta: "orçamento enviado sem resposta",
  atendimento_concluido: "atendimento concluído",
  parcela_vencida: "parcela do contrato vencida",
  contrato_sem_assinatura: "contrato emitido sem assinatura",
};

// Variáveis aceitas na mensagem. Documentadas na tela de edição.
export const VARIAVEIS_MENSAGEM = [
  { chave: "{cliente}", descricao: "primeiro nome do cliente" },
  { chave: "{vendedor}", descricao: "primeiro nome do vendedor" },
  { chave: "{orcamento}", descricao: "número do orçamento ou contrato" },
  { chave: "{valor}", descricao: "valor da parcela em atraso" },
  { chave: "{avaliacao}", descricao: "link de avaliação no Google" },
] as const;

export function renderMensagem(
  template: string,
  ctx: {
    clienteNome: string;
    vendedorNome?: string | null;
    orcamentoNumero?: string | null;
    valor?: string | null;
  }
): string {
  return template
    .replaceAll("{cliente}", ctx.clienteNome.split(" ")[0])
    .replaceAll(
      "{vendedor}",
      ctx.vendedorNome ? ctx.vendedorNome.split(" ")[0] : "a equipe"
    )
    .replaceAll("{orcamento}", ctx.orcamentoNumero ?? "")
    .replaceAll("{valor}", ctx.valor ?? "")
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
  // quando o gatilho aconteceu (envio do orçamento / conclusão / vencimento)
  desde: Date;
  linkWhatsApp: string;
  /** Só na régua de cobrança: valor da parcela, já formatado. */
  valorTexto?: string | null;
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
  } else if (aviso.gatilho === "parcela_vencida") {
    candidatos = await parcelasVencidas(aviso.dias, vendedorId);
  } else if (aviso.gatilho === "contrato_sem_assinatura") {
    candidatos = await contratosSemAssinatura(corte, vendedorId);
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
          valor: c.valorTexto,
        })
      ),
    }));
}


/**
 * Parcelas de contrato assinado que passaram do vencimento há `dias` ou mais.
 *
 * O vencimento é calculado (`vencimentoEfetivo`), não lido de uma coluna: a
 * maioria das parcelas está presa a um evento — "na assinatura", "30 dias
 * após a instalação" — e só ganha data quando o evento acontece. Parcela sem
 * data nunca entra na régua.
 */
async function parcelasVencidas(
  dias: number,
  vendedorId: number | null
): Promise<PendenciaAviso[]> {
  const linhas = await db
    .select({
      parcelaId: contratoPagamentos.id,
      rotulo: contratoPagamentos.rotulo,
      valor: contratoPagamentos.valor,
      gatilho: contratoPagamentos.gatilho,
      diasApos: contratoPagamentos.diasApos,
      dataVencimento: contratoPagamentos.dataVencimento,
      pagoEm: contratoPagamentos.pagoEm,
      numero: contratos.numero,
      dataAssinatura: contratos.dataAssinatura,
      dataEntrega: orcamentoInstalacao.dataEntrega,
      atendimentoId: orcamentos.atendimentoId,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      vendedorNome: vendedores.nome,
    })
    .from(contratoPagamentos)
    .innerJoin(contratos, eq(contratoPagamentos.contratoId, contratos.id))
    .innerJoin(orcamentos, eq(contratos.orcamentoId, orcamentos.id))
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .leftJoin(
      orcamentoInstalacao,
      eq(orcamentoInstalacao.orcamentoId, orcamentos.id)
    )
    .where(
      and(
        eq(clientes.ativo, true),
        // Contrato que ainda não foi assinado não gera cobrança de parcela.
        inArray(contratos.status, ["assinado", "aditivado"]),
        isNull(contratoPagamentos.pagoEm),
        vendedorId != null ? eq(orcamentos.vendedorId, vendedorId) : undefined
      )
    );

  return linhas
    .map((l) => {
      const parcela = {
        gatilho: l.gatilho,
        diasApos: l.diasApos,
        dataVencimento: l.dataVencimento,
        pagoEm: l.pagoEm,
      };
      const marcos = {
        dataAssinatura: l.dataAssinatura,
        dataEntrega: l.dataEntrega ?? null,
      };
      return {
        linha: l,
        vencimento: vencimentoEfetivo(parcela, marcos),
        atraso: diasDeAtraso(parcela, marcos),
      };
    })
    .filter((x) => x.vencimento != null && x.atraso >= dias)
    .sort((a, b) => b.atraso - a.atraso)
    .map((x) => ({
      // O alvo do "já contatei" é a PARCELA, não o contrato: cada parcela é
      // uma cobrança própria.
      alvoId: x.linha.parcelaId,
      atendimentoId: x.linha.atendimentoId,
      clienteNome: x.linha.clienteNome,
      clienteTelefone: x.linha.clienteTelefone,
      vendedorNome: x.linha.vendedorNome,
      orcamentoNumero: x.linha.numero,
      desde: x.vencimento as Date,
      linkWhatsApp: "",
      valorTexto: formatarCentavos(x.linha.valor),
    }));
}

/** Contratos emitidos há `corte` ou mais que ninguém assinou ainda. */
async function contratosSemAssinatura(
  corte: Date,
  vendedorId: number | null
): Promise<PendenciaAviso[]> {
  const linhas = await db
    .select({
      contratoId: contratos.id,
      numero: contratos.numero,
      dataEmissao: contratos.dataEmissao,
      valorTotal: contratos.valorTotal,
      atendimentoId: orcamentos.atendimentoId,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      vendedorNome: vendedores.nome,
    })
    .from(contratos)
    .innerJoin(orcamentos, eq(contratos.orcamentoId, orcamentos.id))
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .where(
      and(
        eq(clientes.ativo, true),
        eq(contratos.status, "emitido"),
        lte(contratos.dataEmissao, corte),
        vendedorId != null ? eq(orcamentos.vendedorId, vendedorId) : undefined
      )
    )
    .orderBy(asc(contratos.dataEmissao));

  return linhas
    .filter((l) => l.dataEmissao != null)
    .map((l) => ({
      alvoId: l.contratoId,
      atendimentoId: l.atendimentoId,
      clienteNome: l.clienteNome,
      clienteTelefone: l.clienteTelefone,
      vendedorNome: l.vendedorNome,
      orcamentoNumero: l.numero,
      desde: l.dataEmissao as Date,
      linkWhatsApp: "",
      valorTexto: formatarCentavos(l.valorTotal),
    }));
}
