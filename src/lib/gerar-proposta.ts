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
  instalacaoItens,
  modelosToldo,
  orcamentoFotos,
  orcamentoInstalacao,
  orcamentoItens,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { rotuloEstrutura, rotuloFormato } from "@/lib/labels";
import { enderecoCompleto } from "@/lib/endereco";
import { contentTypeFoto, lerFoto } from "@/lib/uploads";
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
 *
 * `incluirInstalacao` acrescenta a ficha de instalação como página 2. É a
 * ordem de serviço INTERNA: só a rota autenticada passa true, e mesmo assim
 * só sai quando o orçamento está aprovado. O PDF público do cliente nunca tem.
 */
export async function gerarProposta(
  where: SQL,
  opts: { incluirInstalacao?: boolean; somenteInstalacao?: boolean } = {}
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

  // Fotos anexadas → data URIs para embutir no PDF.
  const fotosRows = await db
    .select()
    .from(orcamentoFotos)
    .where(eq(orcamentoFotos.orcamentoId, linha.orc.id))
    .orderBy(asc(orcamentoFotos.ordem));
  const fotos = fotosRows
    .map((f) => {
      const bytes = lerFoto(linha.orc.id, f.arquivo);
      if (!bytes) return null;
      return `data:${contentTypeFoto(f.arquivo)};base64,${bytes.toString("base64")}`;
    })
    .filter((s): s is string => s !== null);

  // Ficha de instalação (página 2) — interna, só para orçamento aprovado.
  let instalacao: DadosProposta["instalacao"] = null;
  if (opts.incluirInstalacao || opts.somenteInstalacao) {
    const ficha = await db.query.orcamentoInstalacao.findFirst({
      where: eq(orcamentoInstalacao.orcamentoId, linha.orc.id),
    });
    const linhasProduto = await db
      .select()
      .from(instalacaoItens)
      .where(eq(instalacaoItens.orcamentoId, linha.orc.id))
      .orderBy(asc(instalacaoItens.ordem));
    const dia = (d: Date | null | undefined) =>
      d ? format(d, "dd/MM/yyyy") : null;
    instalacao = {
      clienteEmail: linha.cliente.email,
      responsavel: ficha?.responsavel ?? null,
      calha: ficha?.calha ?? null,
      tipoEscada: ficha?.tipoEscada ?? null,
      condEstacionamento: ficha?.condEstacionamento ?? null,
      dataPedido: format(linha.orc.criadoEm, "dd/MM/yyyy"),
      prevEntrega: dia(ficha?.prevEntrega),
      dataEntrega: dia(ficha?.dataEntrega),
      vendedorNome: linha.vendedor?.nome ?? null,
      itens: linhasProduto.map((i) => ({
        qtde: i.qtde,
        produto: i.produto,
        estrutura: i.estrutura,
        revestimento: i.revestimento,
        rufo: i.rufo,
        babado: i.babado,
        vies: i.vies,
      })),
    };
  }

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
          whatsapp: linha.vendedor.whatsapp ?? linha.vendedor.telefone,
          telefoneFixo: linha.vendedor.telefoneFixo,
          email: linha.vendedor.email,
        }
      : null,
    itens: itens.map((item) => ({
      descricao: item.descricao,
      valorMin: item.valorMin,
      valorMax: item.valorMax,
    })),
    logoDataUri,
    fotos,
    instalacao,
    somenteInstalacao: Boolean(opts.somenteInstalacao),
    enderecoCompleto: enderecoCompleto(linha.cliente),
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
