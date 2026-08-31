import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { googleConfigurado, salvarConexao } from "@/lib/google-agenda";
import { lerEstado } from "@/lib/google-estado";

/** Volta do Google com o código de autorização. */
export async function GET(request: Request) {
  const base = process.env.APP_URL;
  const perfil = (msg: string) =>
    NextResponse.redirect(new URL(`/perfil?agenda=${msg}`, base));

  const usuario = await usuarioAtual();
  if (!usuario?.vendedorId) {
    return NextResponse.redirect(new URL("/login", base));
  }
  if (!googleConfigurado()) return perfil("indisponivel");

  const url = new URL(request.url);
  // O vendedor pode ter clicado em "Cancelar" na tela do Google.
  if (url.searchParams.get("error")) return perfil("cancelado");

  // O estado tem que ser NOSSO e ser do vendedor que está logado: é o que
  // impede ligar a agenda de um estranho à conta de alguém.
  const doEstado = lerEstado(url.searchParams.get("state"));
  if (doEstado == null || doEstado !== usuario.vendedorId) {
    return perfil("estado-invalido");
  }

  const codigo = url.searchParams.get("code");
  if (!codigo) return perfil("sem-codigo");

  const { erro } = await salvarConexao(usuario.vendedorId, codigo);
  return perfil(erro ? `erro:${encodeURIComponent(erro)}` : "ok");
}
