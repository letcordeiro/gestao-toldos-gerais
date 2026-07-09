import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirUsuario, encerrarSessao } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";

async function sair() {
  "use server";
  await encerrarSessao();
  redirect("/login");
}

// soGestor: itens de administração escondidos do vendedor
const NAV = [
  { href: "/atendimentos", label: "Atendimentos", soGestor: false },
  { href: "/orcamentos", label: "Orçamentos", soGestor: false },
  { href: "/cadastros/clientes", label: "Clientes", soGestor: false },
  { href: "/cadastros/modelos", label: "Modelos", soGestor: false },
  { href: "/cadastros/vendedores", label: "Vendedores", soGestor: true },
  { href: "/cadastros/fases", label: "Fases", soGestor: true },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirUsuario();
  const ehGestor = usuario.papel === "gestor";
  const navItens = NAV.filter((item) => ehGestor || !item.soGestor);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <Link href="/atendimentos" className="shrink-0">
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
              <span className="hidden max-w-[11rem] truncate text-xs text-muted-foreground sm:inline">
                {usuario.nome ?? usuario.email}
                {ehGestor ? " · gestor" : " · vendedor"}
              </span>
              <form action={sair}>
                <Button variant="ghost" size="sm" type="submit">
                  Sair
                </Button>
              </form>
            </div>
          </div>
          {/* Nav em pílulas roláveis no mobile */}
          <nav className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <NavLinks itens={navItens} />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    </div>
  );
}
