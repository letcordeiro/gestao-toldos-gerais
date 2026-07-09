import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orcamentoFotos, orcamentos } from "@/db/schema";
import { contentTypeFoto, lerFoto } from "@/lib/uploads";

// Rota PÚBLICA: serve a foto se ela pertence ao orçamento daquele token.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; fotoId: string }> }
) {
  const { token, fotoId } = await params;
  const fId = Number(fotoId);
  if (!token || !Number.isInteger(fId)) {
    return NextResponse.json({ erro: "inválido" }, { status: 400 });
  }

  const [linha] = await db
    .select({
      arquivo: orcamentoFotos.arquivo,
      orcamentoId: orcamentoFotos.orcamentoId,
    })
    .from(orcamentoFotos)
    .innerJoin(orcamentos, eq(orcamentoFotos.orcamentoId, orcamentos.id))
    .where(and(eq(orcamentoFotos.id, fId), eq(orcamentos.publicToken, token)));

  if (!linha) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  const bytes = lerFoto(linha.orcamentoId, linha.arquivo);
  if (!bytes) {
    return NextResponse.json({ erro: "arquivo ausente" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeFoto(linha.arquivo),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
