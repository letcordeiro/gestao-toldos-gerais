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

  // Só a proposta comercial. A ficha de instalação é documento separado,
  // em /orcamentos/[id]/ficha/pdf — foi o que a equipe pediu: um botão para
  // cada documento, em vez de dois documentos grudados no mesmo PDF.
  const proposta = await gerarProposta(eq(orcamentos.id, orcamentoId));
  if (!proposta) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  // Vendedor só baixa PDF dos próprios orçamentos.
  const usuario = await usuarioAtual();
  // Não confia só no middleware: sem usuário, a checagem de vendedor abaixo
  // passava direto e o arquivo saía (auditoria de 07/10/2026).
  if (!usuario) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }
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
