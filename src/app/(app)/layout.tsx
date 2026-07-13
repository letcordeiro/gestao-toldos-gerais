import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { exigirUsuario, encerrarSessao } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";
import { BottomNav } from "./bottom-nav";

async function sair() {
  "use server";
  await encerrarSessao();
  redirect("/login");
}

// soGestor: itens de administração escondidos do vendedor.
// curto: rótulo compacto usado no menu inferior (mobile), pra caber em qualquer tela.
const NAV = [
  { href: "/atendimentos", label: "Atendimentos", curto: "Atend.", icon: "atendimentos", soGestor: false },
  { href: "/orcamentos", label: "Orçamentos", curto: "Orçam.", icon: "orcamentos", soGestor: false },
  { href: "/cadastros/clientes", label: "Clientes", curto: "Clientes", icon: "clientes", soGestor: false },
  { href: "/cadastros/modelos", label: "Modelos", curto: "Modelos", icon: "modelos", soGestor: false },
  { href: "/cadastros/vendedores", label: "Vendedores", curto: "Vend.", icon: "vendedores", soGestor: true },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirUsuario();
  // Vendedor precisa completar o cadastro antes de usar o sistema.
  if (usuario.vendedorId != null && !usuario.perfilCompleto) {
    redirect("/perfil");
  }
  const ehGestor = usuario.papel === "gestor";
  const navItens = NAV.filter((item) => ehGestor || !item.soGestor);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <Link
              href="/painel"
              title="Ir para o início"
              aria-label="Ir para o início"
              data-tour="inicio"
              className="shrink-0 rounded-md transition-opacity hover:opacity-80"
            >
              <Image
                src="/logo.png"
                alt="Toldos Gerais — início"
                width={80}
                height={43}
                priority
              />
            </Link>
            {/* Nav inline no desktop */}
            <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
              <NavLinks itens={navItens} />
            </nav>
            <div className="flex shrink-0 items-center gap-1">
              {usuario.vendedorId != null ? (
                <Link
                  href="/perfil"
                  data-tour="perfil"
                  className="flex max-w-[8.5rem] items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:max-w-[13rem]"
                >
                  <UserRound className="size-4 shrink-0" />
                  <span className="truncate">
                    {usuario.nome ?? usuario.email}
                    <span className="hidden sm:inline">
                      {ehGestor ? " · gestor" : " · vendedor"}
                    </span>
                  </span>
                </Link>
              ) : (
                <span className="flex max-w-[8.5rem] items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground sm:max-w-[13rem]">
                  <UserRound className="size-4 shrink-0" />
                  <span className="truncate">
                    {usuario.nome ?? usuario.email}
                    <span className="hidden sm:inline"> · gestor</span>
                  </span>
                </span>
              )}
              <form action={sair}>
                <Button variant="ghost" size="sm" type="submit">
                  Sair
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>
      {/* No mobile o conteúdo precisa de espaço para a barra fixa do rodapé */}
      <main className="mx-auto max-w-6xl px-4 py-5 pb-28 md:pb-6">
        {children}
      </main>
      {/* Menu no rodapé (só mobile) */}
      <BottomNav itens={navItens} />
    </div>
  );
}
