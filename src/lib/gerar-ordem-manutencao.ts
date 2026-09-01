import "server-only";
import { createElement } from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import {
  atendimentos,
  chamados,
  clientes,
  orcamentoInstalacao,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { linhasDaFicha } from "@/lib/chamados";
import { enderecoCompleto } from "@/lib/endereco";
import { formatarCentavos } from "@/lib/format";
import {
  OrdemManutencaoPDF,
  type DadosOrdemManutencao,
} from "@/app/(app)/chamados/[id]/pdf/ordem-manutencao-pdf";

export type OrdemGerada = {
  clienteNome: string;
  /** Dono do atendimento — a rota usa para barrar vendedor de outro cliente. */
  vendedorId: number | null;
  buffer: Buffer;
};

const data = (d: Date | null | undefined) =>
  d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "";

/**
 * Monta a Ordem de Manutenção de um chamado em PDF.
 *
 * Os dados vêm de onde já moram: cliente e vendedor do atendimento, data da
 * instalação da ficha do orçamento ligado ao chamado. Nada é copiado para o
 * chamado na hora de abrir — assim a ficha impressa hoje reflete o cadastro
 * de hoje, e corrigir um telefone conserta a próxima impressão sozinho.
 */
export type OrdemCarregada = {
  clienteNome: string;
  vendedorId: number | null;
  dados: DadosOrdemManutencao;
};

/**
 * Carrega TUDO que a ficha mostra, uma vez só.
 *
 * Existe separado do PDF porque a ficha sai em dois formatos: o PDF (para
 * salvar e mandar) e a página de impressão (que é a que funciona no celular —
 * navegador de celular não imprime PDF). Os dois lêem daqui, senão um dia um
 * campo aparece num e não no outro.
 */
export async function dadosDaOrdem(
  chamadoId: number
): Promise<OrdemCarregada | null> {
  const [linha] = await db
    .select({
      chamado: chamados,
      cliente: clientes,
      vendedorId: atendimentos.vendedorId,
      vendedorNome: vendedores.nome,
      numero: orcamentos.numero,
    })
    .from(chamados)
    .innerJoin(atendimentos, eq(chamados.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(vendedores, eq(atendimentos.vendedorId, vendedores.id))
    .leftJoin(orcamentos, eq(chamados.orcamentoId, orcamentos.id))
    .where(eq(chamados.id, chamadoId));

  if (!linha) return null;
  const { chamado, cliente } = linha;

  // Data da instalação: sai da ficha do serviço que gerou o chamado. Sem
  // orçamento ligado, a linha vai em branco para preencher à mão.
  let dataInstalacao: Date | null = null;
  if (chamado.orcamentoId) {
    const ficha = await db.query.orcamentoInstalacao.findFirst({
      where: eq(orcamentoInstalacao.orcamentoId, chamado.orcamentoId),
    });
    dataInstalacao = ficha?.dataEntrega ?? null;
  }

  const logo = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

  const dados: DadosOrdemManutencao = {
    numero: linha.numero ?? null,
    clienteNome: cliente.nome,
    clienteTelefone: cliente.telefone,
    endereco: enderecoCompleto(cliente),
    dataInstalacao: data(dataInstalacao),
    naGarantia: chamado.naGarantia,
    vendedor: linha.vendedorNome ?? "",
    valor: chamado.valor != null ? formatarCentavos(chamado.valor) : "",
    dataLigacao: data(chamado.criadoEm),
    instalador: chamado.instalador ?? "",
    tipoServico: chamado.tipoServico,
    servicoOutros: chamado.servicoOutros ?? "",
    dataVisita: data(chamado.visitaEm),
    linhasRelato: linhasDaFicha(chamado.descricao),
    logoDataUri: `data:image/png;base64,${logo.toString("base64")}`,
  };

  return { clienteNome: cliente.nome, vendedorId: linha.vendedorId, dados };
}

/** A ficha em PDF — para salvar e mandar. */
export async function gerarOrdemManutencao(
  chamadoId: number
): Promise<OrdemGerada | null> {
  const carregada = await dadosDaOrdem(chamadoId);
  if (!carregada) return null;

  const documento = createElement(OrdemManutencaoPDF, {
    dados: carregada.dados,
  }) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
  const buffer = await renderToBuffer(documento);

  return {
    clienteNome: carregada.clienteNome,
    vendedorId: carregada.vendedorId,
    buffer,
  };
}
