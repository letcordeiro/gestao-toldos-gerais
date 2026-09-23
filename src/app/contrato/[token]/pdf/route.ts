import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { contratos } from "@/db/schema";
import { gerarContrato } from "@/lib/gerar-contrato";

// Rota PÚBLICA: quem tem o link (enviado por WhatsApp) baixa o contrato.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const contrato = token
    ? await gerarContrato(eq(contratos.publicToken, token))
    : null;
  if (!contrato) {
    // Quem abre isto é o cliente, no celular: JSON cru na tela não diz nada.
    // A página HTML do mesmo token já explica em português e dá os contatos.
    // Location relativo de propósito — atrás do Traefik o host da requisição
    // nem sempre é o domínio público.
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `/contrato/${encodeURIComponent(token ?? "")}` },
    });
  }

  // O botão "Baixar PDF" da página pública manda ?download=1: sem respeitar o
  // parâmetro, o celular abria o visualizador em vez de salvar o arquivo.
  const baixar = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(contrato.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="contrato-${contrato.numero ?? "minuta"}.pdf"`,
    },
  });
}
