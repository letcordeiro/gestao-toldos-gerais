import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

const ROTAS_PUBLICAS = [
  /^\/login$/,
  /^\/esqueci-senha$/,
  /^\/redefinir-senha\/.+/,
  /^\/senha-alterada$/,
  /^\/cadastro\/.+/,
  /^\/cadastro-vendedor\/.+/,
  /^\/proposta\/.+/,
  /^\/contrato\/.+/,
  /^\/pesquisa\/.+/,
  /^\/cotacao\/.+/,
  // O cron do resumo chama sem cookie, só com o Bearer — a própria rota
  // confere o token. Fora desta lista, o middleware devolvia 307 para /login
  // e o curl do cron terminava "com sucesso": o resumo nunca saiu
  // (auditoria de 07/10/2026).
  /^\/api\/resumos$/,
  // Saúde do sistema: só ok/erro, para monitor de uptime.
  /^\/api\/saude$/,
  /^\/manifest\.webmanifest$/,
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ROTAS_PUBLICAS.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  const sessao = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (!sessao) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Arquivo estático pula o middleware só se TERMINAR em .png/.jpg/… — sem o
  // `$`, qualquer caminho que tivesse ".png" no meio passava sem login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
