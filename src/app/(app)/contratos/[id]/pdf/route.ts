import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { contratos, orcamentos } from "@/db/schema";
import { db } from "@/db";
import { usuarioAtual } from "@/lib/auth";
import { gerarContrato } from "@/lib/gerar-contrato";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contratoId = Number(id);
  if (!Number.isInteger(contratoId)) {
    return NextResponse.json({ erro: "id inválido" }, { status: 400 });
  }

  const contrato = await gerarContrato(eq(contratos.id, contratoId));
  if (!contrato) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  // Vendedor só baixa contrato de orçamento dele.
  const usuario = await usuarioAtual();
  if (usuario?.papel === "vendedor") {
    const orc = await db.query.orcamentos.findFirst({
      where: eq(orcamentos.id, contrato.orcamentoId),
    });
    if (!orc || orc.vendedorId !== usuario.vendedorId) {
      return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
    }
  }

  const baixar = new URL(request.url).searchParams.get("download") === "1";
  const disposicao = baixar ? "attachment" : "inline";
  const nome = contrato.numero ?? `minuta-${contratoId}`;

  return new NextResponse(new Uint8Array(contrato.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposicao}; filename="contrato-${nome}.pdf"`,
    },
  });
}
