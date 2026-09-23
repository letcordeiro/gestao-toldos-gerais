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

  const proposta = token
    ? await gerarProposta(eq(orcamentos.publicToken, token))
    : null;
  if (!proposta) {
    // Quem abre isto é o cliente, no celular: JSON cru na tela não diz nada.
    // A página HTML do mesmo token já explica em português e dá os contatos.
    // Location relativo de propósito — atrás do Traefik o host da requisição
    // nem sempre é o domínio público.
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `/proposta/${encodeURIComponent(token ?? "")}` },
    });
  }

  return new NextResponse(new Uint8Array(proposta.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="proposta-${proposta.numero}.pdf"`,
    },
  });
}
