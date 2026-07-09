"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Contact,
  FileText,
  Home,
  ListChecks,
  Package,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: string };

const ICONS: Record<string, LucideIcon> = {
  painel: Home,
  atendimentos: ListChecks,
  orcamentos: FileText,
  clientes: Contact,
  modelos: Package,
  vendedores: Users,
  fases: Tag,
};

// Barra de navegação fixa no rodapé (só mobile) — mais fácil de alcançar com o polegar.
export function BottomNav({ itens }: { itens: Item[] }) {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:hidden">
      <div
        className="mx-auto flex max-w-6xl items-stretch px-1 pb-[env(safe-area-inset-bottom)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {itens.map((item) => {
          const Icon = ICONS[item.icon] ?? Home;
          const ativo =
            path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[64px] flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                ativo ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={ativo ? 2.4 : 2} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
