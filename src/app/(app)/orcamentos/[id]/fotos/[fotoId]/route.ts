import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orcamentoFotos, orcamentos } from "@/db/schema";
import { usuarioAtual } from "@/lib/auth";
import { contentTypeFoto, lerFoto } from "@/lib/uploads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fotoId: string }> }
) {
  const { id, fotoId } = await params;
  const orcamentoId = Number(id);
  const fId = Number(fotoId);
  if (!Number.isInteger(orcamentoId) || !Number.isInteger(fId)) {
    return NextResponse.json({ erro: "inválido" }, { status: 400 });
  }

  const foto = await db.query.orcamentoFotos.findFirst({
    where: eq(orcamentoFotos.id, fId),
  });
  if (!foto || foto.orcamentoId !== orcamentoId) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  // Vendedor só vê fotos dos próprios orçamentos.
  const usuario = await usuarioAtual();
  if (usuario?.papel === "vendedor") {
    const orc = await db.query.orcamentos.findFirst({
      where: eq(orcamentos.id, orcamentoId),
    });
    if (!orc || orc.vendedorId !== usuario.vendedorId) {
      return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
    }
  }

  const bytes = lerFoto(orcamentoId, foto.arquivo);
  if (!bytes) {
    return NextResponse.json({ erro: "arquivo ausente" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeFoto(foto.arquivo),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
