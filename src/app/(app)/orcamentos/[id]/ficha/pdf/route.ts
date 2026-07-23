import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { orcamentos } from "@/db/schema";
import { usuarioAtual } from "@/lib/auth";
import { gerarProposta } from "@/lib/gerar-proposta";

/**
 * Ficha de instalação como documento próprio (1 página).
 * Uso INTERNO — nunca é exposta na rota pública /proposta/[token].
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orcamentoId = Number(id);
  if (!Number.isInteger(orcamentoId)) {
    return NextResponse.json({ erro: "id inválido" }, { status: 400 });
  }

  const doc = await gerarProposta(eq(orcamentos.id, orcamentoId), {
    somenteInstalacao: true,
  });
  if (!doc) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  // Vendedor só acessa a ficha dos próprios orçamentos.
  const usuario = await usuarioAtual();
  if (usuario?.papel === "vendedor" && doc.vendedorId !== usuario.vendedorId) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  const baixar = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(doc.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="ficha-instalacao-${doc.numero}.pdf"`,
    },
  });
}
