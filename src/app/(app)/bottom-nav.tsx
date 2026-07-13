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

type Item = { href: string; label: string; curto?: string; icon: string };

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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card shadow-[0_-2px_12px_rgba(0,0,0,0.06)] md:hidden">
      <div className="mx-auto flex max-w-6xl items-stretch gap-0.5 px-1 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {itens.map((item) => {
          const Icon = ICONS[item.icon] ?? Home;
          const ativo =
            path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={item.icon}
              className={cn(
                "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[10px] font-medium transition-colors active:scale-95",
                ativo
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground active:bg-secondary"
              )}
            >
              <Icon className="size-6 shrink-0" strokeWidth={ativo ? 2.4 : 2} />
              <span className="w-full truncate text-center leading-none">
                {item.curto ?? item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
