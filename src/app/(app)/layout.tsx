import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirSessao, encerrarSessao } from "@/lib/auth";
import { Button } from "@/components/ui/button";

async function sair() {
  "use server";
  await encerrarSessao();
  redirect("/login");
}

const NAV = [
  { href: "/atendimentos", label: "Atendimentos" },
  { href: "/orcamentos", label: "Orçamentos" },
  { href: "/cadastros/clientes", label: "Clientes" },
  { href: "/cadastros/modelos", label: "Modelos" },
  { href: "/cadastros/vendedores", label: "Vendedores" },
  { href: "/cadastros/fases", label: "Fases" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await exigirSessao();

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
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={sair}>
            <Button variant="ghost" size="sm" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
