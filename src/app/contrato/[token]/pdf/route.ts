import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { contratos } from "@/db/schema";
import { gerarContrato } from "@/lib/gerar-contrato";

// Rota PÚBLICA: quem tem o link (enviado por WhatsApp) baixa o contrato.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ erro: "token inválido" }, { status: 400 });
  }

  const contrato = await gerarContrato(eq(contratos.publicToken, token));
  if (!contrato) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(contrato.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contrato-${contrato.numero ?? "minuta"}.pdf"`,
    },
  });
}
