import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { exigirUsuario, encerrarSessao, PAPEL_LABEL } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";
import { BottomNav } from "./bottom-nav";
import { MenuConfiguracoes } from "./menu-config";

async function sair() {
  "use server";
  await encerrarSessao();
  redirect("/login");
}

// A navegação principal segue o dia de trabalho, na ordem em que ele acontece:
// olho o painel, faço as tarefas, ando com os atendimentos, mando orçamento,
// fecho contrato. Cadastro que se configura uma vez foi para a engrenagem.
// curto: rótulo compacto do menu inferior (mobile).
const NAV = [
  { href: "/painel", label: "Painel", curto: "Painel", icon: "painel", soGestor: false },
  { href: "/tarefas", label: "Tarefas", curto: "Tarefas", icon: "tarefas", soGestor: false },
  { href: "/atendimentos", label: "Atendimentos", curto: "Atend.", icon: "atendimentos", soGestor: false },
  { href: "/orcamentos", label: "Orçamentos", curto: "Orçam.", icon: "orcamentos", soGestor: false },
  { href: "/instalacoes", label: "Instalações", curto: "Instal.", icon: "instalacoes", soGestor: false },
  { href: "/contratos", label: "Contratos", curto: "Contr.", icon: "contratos", soGestor: false },
  { href: "/cadastros/clientes", label: "Clientes", curto: "Clientes", icon: "clientes", soGestor: false },
];

// Menu da engrenagem (desktop) e da aba "Mais" (mobile). Só o gestor vê.
const CONFIG: { titulo: string; itens: { href: string; label: string; ajuda: string }[] }[] = [
  {
    titulo: "Como o funil funciona",
    itens: [
      {
        href: "/cadastros/fases",
        label: "Fases",
        ajuda: "Etapas do funil e o que cada uma libera",
      },
      {
        href: "/cadastros/gatilhos",
        label: "Automações",
        ajuda: "Tarefas que nascem sozinhas",
      },
      {
        href: "/cadastros/avisos",
        label: "Avisos",
        ajuda: "Lembretes de WhatsApp na lista",
      },
      {
        href: "/cadastros/motivos-perda",
        label: "Motivos de perda",
        ajuda: "O que responder quando o negócio cai",
      },
      {
        href: "/cadastros/resumos",
        label: "Resumo por e-mail",
        ajuda: "O sistema te manda notícia sem você abrir",
      },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      {
        href: "/cadastros/modelos",
        label: "Modelos de toldo",
        ajuda: "Textos que preenchem a proposta",
      },
      {
        href: "/cadastros/usuarios",
        label: "Usuários",
        ajuda: "Quem entra e o que pode fazer",
      },
    ],
  },
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

  // No mobile a barra de baixo cabe em cinco: as quatro telas do dia + um
  // botão que abre o resto.
  const NO_MENU = ["contratos", "clientes"];
  const bottomItens = navItens.filter((item) => !NO_MENU.includes(item.icon));
  const grupoMais = {
    label: "Mais",
    curto: "Mais",
    icon: "gestor",
    itens: [
      ...navItens.filter((item) => NO_MENU.includes(item.icon)),
      ...(ehGestor
        ? CONFIG.flatMap((g) =>
            g.itens.map((i) => ({
              href: i.href,
              label: i.label,
              curto: i.label,
              icon: "config",
            }))
          )
        : []),
    ],
  };

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
              {ehGestor && <MenuConfiguracoes grupos={CONFIG} />}
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
                      {` · ${PAPEL_LABEL[usuario.papel]}`}
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
      <BottomNav itens={bottomItens} grupo={grupoMais} />
    </div>
  );
}
