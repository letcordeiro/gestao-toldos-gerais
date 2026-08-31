import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { googleConfigurado, urlDeAutorizacao } from "@/lib/google-agenda";
import { criarEstado } from "@/lib/google-estado";

/** Começa a conexão: manda o vendedor autorizar no Google. */
export async function GET() {
  const usuario = await usuarioAtual();
  if (!usuario?.vendedorId) {
    return NextResponse.redirect(new URL("/login", process.env.APP_URL));
  }
  if (!googleConfigurado()) {
    return NextResponse.redirect(
      new URL("/perfil?agenda=indisponivel", process.env.APP_URL)
    );
  }
  return NextResponse.redirect(
    urlDeAutorizacao(criarEstado(usuario.vendedorId))
  );
}
