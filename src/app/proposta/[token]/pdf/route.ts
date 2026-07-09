import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { orcamentos } from "@/db/schema";
import { gerarProposta } from "@/lib/gerar-proposta";

// Rota PÚBLICA: qualquer pessoa com o token (link enviado ao cliente) vê o PDF.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ erro: "token inválido" }, { status: 400 });
  }

  const proposta = await gerarProposta(eq(orcamentos.publicToken, token));
  if (!proposta) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(proposta.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="proposta-${proposta.numero}.pdf"`,
    },
  });
}
