import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirUsuario, encerrarSessao } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";
import { BottomNav } from "./bottom-nav";

async function sair() {
  "use server";
  await encerrarSessao();
  redirect("/login");
}

// soGestor: itens de administração escondidos do vendedor
const NAV = [
  { href: "/painel", label: "Início", icon: "painel", soGestor: false },
  { href: "/atendimentos", label: "Atendimentos", icon: "atendimentos", soGestor: false },
  { href: "/orcamentos", label: "Orçamentos", icon: "orcamentos", soGestor: false },
  { href: "/cadastros/clientes", label: "Clientes", icon: "clientes", soGestor: false },
  { href: "/cadastros/modelos", label: "Modelos", icon: "modelos", soGestor: false },
  { href: "/cadastros/vendedores", label: "Vendedores", icon: "vendedores", soGestor: true },
  { href: "/cadastros/fases", label: "Fases", icon: "fases", soGestor: true },
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
            <Link href="/painel" className="shrink-0">
              <Image
                src="/logo.png"
                alt="Toldos Gerais"
                width={80}
                height={43}
                priority
              />
            </Link>
            {/* Nav inline no desktop */}
            <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
              <NavLinks itens={navItens} />
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              {usuario.vendedorId != null ? (
                <Link
                  href="/perfil"
                  className="hidden max-w-[11rem] truncate text-xs text-muted-foreground hover:text-foreground hover:underline sm:inline"
                >
                  {usuario.nome ?? usuario.email}
                  {ehGestor ? " · gestor" : " · vendedor"}
                </Link>
              ) : (
                <span className="hidden max-w-[11rem] truncate text-xs text-muted-foreground sm:inline">
                  {usuario.nome ?? usuario.email} · gestor
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
      <main className="mx-auto max-w-6xl px-4 py-5 pb-24 md:pb-6">
        {children}
      </main>
      {/* Menu no rodapé (só mobile) */}
      <BottomNav itens={navItens} />
    </div>
  );
}
