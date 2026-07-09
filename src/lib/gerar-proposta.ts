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
  atendimentos,
  clientes,
  modelosToldo,
  orcamentoItens,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { rotuloEstrutura, rotuloFormato } from "@/lib/labels";
import {
  PropostaPDF,
  type DadosProposta,
} from "@/app/(app)/orcamentos/[id]/pdf/proposta-pdf";

export type PropostaGerada = {
  numero: string;
  vendedorId: number | null;
  buffer: Buffer;
};

/**
 * Carrega o orçamento por uma condição (id ou public_token), monta o PDF e
 * devolve o buffer. Retorna null se não encontrar. Compartilhado pela rota
 * autenticada (/orcamentos/[id]/pdf) e pela pública (/proposta/[token]/pdf).
 */
export async function gerarProposta(
  where: SQL
): Promise<PropostaGerada | null> {
  const [linha] = await db
    .select({
      orc: orcamentos,
      cliente: clientes,
      modeloNome: modelosToldo.nome,
      vendedor: vendedores,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(modelosToldo, eq(orcamentos.modeloId, modelosToldo.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .where(where);

  if (!linha) return null;

  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, linha.orc.id))
    .orderBy(asc(orcamentoItens.ordem));

  const logo = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
  const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

  const dados: DadosProposta = {
    numero: linha.orc.numero,
    dataExtenso: format(linha.orc.criadoEm, "d 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    }),
    cliente: {
      nome: linha.cliente.nome,
      telefone: linha.cliente.telefone,
      endereco: linha.cliente.endereco,
      numero: linha.cliente.numero,
      complemento: linha.cliente.complemento,
      bairro: linha.cliente.bairro,
      cidade: linha.cliente.cidade,
      cep: linha.cliente.cep,
    },
    modeloNome: linha.modeloNome,
    formatoLabel: linha.orc.formato ? rotuloFormato(linha.orc.formato) : null,
    descricaoMaterial: linha.orc.descricaoMaterial,
    estruturaLabel: rotuloEstrutura(linha.orc.tipoEstrutura) || null,
    fixacaoVedacao: linha.orc.fixacaoVedacao,
    garantiaTexto: linha.orc.garantiaTexto,
    formaPagamento: linha.orc.formaPagamento,
    prazoEntrega: linha.orc.prazoEntrega,
    vendedor: linha.vendedor
      ? {
          nome: linha.vendedor.nome,
          telefone: linha.vendedor.telefone,
          email: linha.vendedor.email,
        }
      : null,
    itens: itens.map((item) => ({
      descricao: item.descricao,
      valorMin: item.valorMin,
      valorMax: item.valorMax,
    })),
    logoDataUri,
  };

  const documento = createElement(PropostaPDF, {
    dados,
  }) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
  const buffer = await renderToBuffer(documento);

  return {
    numero: linha.orc.numero,
    vendedorId: linha.orc.vendedorId,
    buffer,
  };
}
