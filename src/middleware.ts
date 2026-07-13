import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

const ROTAS_PUBLICAS = [
  /^\/login$/,
  /^\/esqueci-senha$/,
  /^\/cadastro\/.+/,
  /^\/cadastro-vendedor\/.+/,
  /^\/proposta\/.+/,
  /^\/api\/cadastro(\/.*)?$/,
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:png|jpg|svg|ico|webp)).*)"],
};
