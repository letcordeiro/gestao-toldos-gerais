import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { orcamentos } from "@/db/schema";
import { usuarioAtual } from "@/lib/auth";
import { gerarProposta } from "@/lib/gerar-proposta";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orcamentoId = Number(id);
  if (!Number.isInteger(orcamentoId)) {
    return NextResponse.json({ erro: "id inválido" }, { status: 400 });
  }

  // PDF interno do vendedor: leva a ficha de instalação como página 2
  // (o gerador só a inclui de fato quando o orçamento está aprovado).
  const proposta = await gerarProposta(eq(orcamentos.id, orcamentoId), {
    incluirInstalacao: true,
  });
  if (!proposta) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  // Vendedor só baixa PDF dos próprios orçamentos.
  const usuario = await usuarioAtual();
  if (
    usuario?.papel === "vendedor" &&
    proposta.vendedorId !== usuario.vendedorId
  ) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  // ?download=1 força o "salvar como" do navegador; sem ele o PDF abre na tela
  // (é assim que a página de impressão consegue embutir e mandar imprimir).
  const baixar = new URL(request.url).searchParams.get("download") === "1";
  const disposicao = baixar ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(proposta.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposicao}; filename="orcamento-${proposta.numero}.pdf"`,
    },
  });
}
