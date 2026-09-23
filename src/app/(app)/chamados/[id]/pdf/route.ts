import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { vendedorVeChamado } from "@/lib/chamados";
import {
  gerarOrdemManutencao,
  nomeArquivoOrdem,
} from "@/lib/gerar-ordem-manutencao";

/**
 * Ordem de Manutenção em PDF. Uso INTERNO: é o papel que a equipe leva ao
 * local, não existe versão pública dela.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chamadoId = Number(id);
  if (!Number.isInteger(chamadoId)) {
    return NextResponse.json({ erro: "id inválido" }, { status: 400 });
  }

  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }

  const doc = await gerarOrdemManutencao(chamadoId);
  if (!doc) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  // A mesma regra da lista e da tela do chamado.
  if (
    usuario.papel === "vendedor" &&
    !vendedorVeChamado(
      { responsavelId: doc.responsavelId, vendedorDoAtendimentoId: doc.vendedorId },
      usuario.vendedorId
    )
  ) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  const baixar = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(doc.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nomeArquivoOrdem(doc.clienteNome)}"`,
    },
  });
}
