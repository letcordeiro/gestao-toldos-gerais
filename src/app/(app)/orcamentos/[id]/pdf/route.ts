import { createElement } from "react";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { asc, eq } from "drizzle-orm";
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
import { usuarioAtual } from "@/lib/auth";
import { PropostaPDF, type DadosProposta } from "./proposta-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orcamentoId = Number(id);
  if (!Number.isInteger(orcamentoId)) {
    return NextResponse.json({ erro: "id inválido" }, { status: 400 });
  }

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
    .where(eq(orcamentos.id, orcamentoId));

  if (!linha) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  // Vendedor só baixa PDF dos próprios orçamentos.
  const usuario = await usuarioAtual();
  if (
    usuario?.papel === "vendedor" &&
    linha.orc.vendedorId !== usuario.vendedorId
  ) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, orcamentoId))
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

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="proposta-${linha.orc.numero}.pdf"`,
    },
  });
}
