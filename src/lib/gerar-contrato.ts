import "server-only";
import { createElement } from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { asc, eq, type SQL } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import {
  clientes,
  contratoAditivos,
  contratoItens,
  contratoPagamentos,
  contratos,
} from "@/db/schema";
import { EMPRESA_CONTRATO } from "@/lib/empresa";
import { enderecoCompleto } from "@/lib/endereco";
import type { DadosContrato } from "@/lib/contrato-clausulas";
import type { LinhaPagamento } from "@/lib/contratos";
import {
  ContratoPDF,
  type DadosContratoPDF,
} from "@/app/(app)/contratos/[id]/pdf/contrato-pdf";

export type ContratoGerado = {
  numero: string | null;
  orcamentoId: number;
  buffer: Buffer;
};

function dataExtenso(d: Date | null | undefined): string | null {
  return d ? format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : null;
}

/**
 * Carrega os dados do contrato (por id ou public_token) e devolve o PDF.
 * Compartilhado pela rota autenticada e pela pública, como em gerarProposta.
 */
export async function carregarDadosContrato(
  where: SQL
): Promise<{ dados: DadosContrato; minuta: boolean; orcamentoId: number } | null> {
  const [linha] = await db
    .select({ contrato: contratos, cliente: clientes })
    .from(contratos)
    .innerJoin(clientes, eq(contratos.clienteId, clientes.id))
    .where(where);
  if (!linha) return null;
  const { contrato, cliente } = linha;

  const itens = await db
    .select()
    .from(contratoItens)
    .where(eq(contratoItens.contratoId, contrato.id))
    .orderBy(asc(contratoItens.ordem));

  const pagamentos = await db
    .select()
    .from(contratoPagamentos)
    .where(eq(contratoPagamentos.contratoId, contrato.id))
    .orderBy(asc(contratoPagamentos.ordem));

  const aditivos = await db
    .select()
    .from(contratoAditivos)
    .where(eq(contratoAditivos.contratoId, contrato.id))
    .orderBy(asc(contratoAditivos.numero));

  const linhasPagamento: LinhaPagamento[] = pagamentos.map((p) => ({
    ordem: p.ordem,
    rotulo: p.rotulo,
    tipo: p.tipo,
    valor: p.valor,
    meio: p.meio,
    numeroParcelas: p.numeroParcelas,
    gatilho: p.gatilho,
    diasApos: p.diasApos,
    dataVencimento: p.dataVencimento
      ? format(p.dataVencimento, "yyyy-MM-dd")
      : null,
  }));

  const dados: DadosContrato = {
    numero: contrato.numero,
    versao: contrato.versao,
    status: contrato.status,
    escopo: contrato.escopo,
    localInstalacao: contrato.localInstalacao,
    observacoesTecnicas: contrato.observacoesTecnicas,
    valorTotal: contrato.valorTotal,
    prazoDiasUteis: contrato.prazoDiasUteis,
    garantiaMeses: contrato.garantiaMeses,
    retencaoPercent: contrato.retencaoPercent,
    multaPercent: contrato.multaPercent,
    jurosMesPercent: contrato.jurosMesPercent,
    flagMedidas: contrato.flagMedidas,
    flagClima: contrato.flagClima,
    flagEnergia: contrato.flagEnergia,
    flagSobMedida: contrato.flagSobMedida,
    representante: contrato.representante,
    cidadeEmissao: contrato.cidadeEmissao,
    dataEmissaoExtenso: dataExtenso(contrato.dataEmissao),
    contratante: {
      nome: cliente.nome,
      documento: cliente.documento,
      endereco: enderecoCompleto(cliente) || null,
      telefone: cliente.telefone,
      email: cliente.email,
    },
    itens: itens.map((i) => ({
      modelo: i.modelo,
      cor: i.cor,
      medidasM2: i.medidasM2,
      descricaoExtra: i.descricaoExtra,
    })),
    pagamentos: linhasPagamento,
    aditivos: aditivos.map((a) => ({
      numero: a.numero,
      objeto: a.objeto,
      deltaValor: a.deltaValor,
      novoPrazoDiasUteis: a.novoPrazoDiasUteis,
      dataAssinaturaExtenso: dataExtenso(a.dataAssinatura),
    })),
  };

  return {
    dados,
    minuta: contrato.status === "rascunho",
    orcamentoId: contrato.orcamentoId,
  };
}

export async function gerarContrato(where: SQL): Promise<ContratoGerado | null> {
  const carregado = await carregarDadosContrato(where);
  if (!carregado) return null;

  // O contrato sai com a logo do emitente (Distribuidora Alvorada), não com a
  // da Toldos Gerais — que continua na proposta e nas páginas públicas.
  const logo = fs.readFileSync(
    path.join(process.cwd(), "public", EMPRESA_CONTRATO.logoArquivo)
  );
  const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

  const dadosPDF: DadosContratoPDF = {
    ...carregado.dados,
    logoDataUri,
    minuta: carregado.minuta,
  };

  const documento = createElement(ContratoPDF, {
    dados: dadosPDF,
  }) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
  const buffer = await renderToBuffer(documento);

  return {
    numero: carregado.dados.numero,
    orcamentoId: carregado.orcamentoId,
    buffer,
  };
}
