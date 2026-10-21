import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { atendimentoFotos, atendimentos } from "@/db/schema";
import { usuarioAtual } from "@/lib/auth";
import { contentTypeFoto, lerFotoAtendimento } from "@/lib/uploads";

// Foto que o cliente mandou no WhatsApp do Tadeu. Mesma regra da tela do
// atendimento: vendedor só vê as do próprio atendimento.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fotoId: string }> }
) {
  const { id, fotoId } = await params;
  const atendimentoId = Number(id);
  const fId = Number(fotoId);
  if (!Number.isInteger(atendimentoId) || !Number.isInteger(fId)) {
    return NextResponse.json({ erro: "inválido" }, { status: 400 });
  }

  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }

  const foto = await db.query.atendimentoFotos.findFirst({
    where: eq(atendimentoFotos.id, fId),
  });
  if (!foto || foto.atendimentoId !== atendimentoId) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }
  if (usuario.papel === "vendedor") {
    const at = await db.query.atendimentos.findFirst({
      where: eq(atendimentos.id, atendimentoId),
    });
    if (!at || at.vendedorId !== usuario.vendedorId) {
      return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
    }
  }

  const bytes = lerFotoAtendimento(atendimentoId, foto.arquivo);
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
