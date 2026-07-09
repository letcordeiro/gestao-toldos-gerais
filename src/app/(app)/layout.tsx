import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirUsuario, encerrarSessao } from "@/lib/auth";
import { Button } from "@/components/ui/button";

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
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/atendimentos" className="shrink-0">
            <Image
              src="/logo.png"
              alt="Toldos Gerais"
              width={88}
              height={48}
              priority
            />
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {navItens.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
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
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
