"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Contact,
  FileText,
  Home,
  ListChecks,
  Package,
  Settings,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; curto?: string; icon: string };
type Grupo = { label: string; curto?: string; icon: string; itens: Item[] };

const ICONS: Record<string, LucideIcon> = {
  painel: Home,
  atendimentos: ListChecks,
  orcamentos: FileText,
  clientes: Contact,
  modelos: Package,
  vendedores: Users,
  fases: Tag,
  gestor: Settings,
};

// Barra de navegação fixa no rodapé (só mobile) — mais fácil de alcançar com o polegar.
export function BottomNav({
  itens,
  grupo,
}: {
  itens: Item[];
  grupo?: Grupo;
}) {
  const path = usePathname();
  const [aberto, setAberto] = useState(false);

  const ativo = (href: string) =>
    path === href || path.startsWith(`${href}/`);
  const grupoAtivo = grupo?.itens.some((i) => ativo(i.href)) ?? false;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card shadow-[0_-2px_12px_rgba(0,0,0,0.06)] md:hidden">
      {/* Menu do grupo Gestor — abre acima do botão */}
      {grupo && aberto && (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute inset-x-3 bottom-full z-50 mb-2 overflow-hidden rounded-xl border bg-card shadow-xl">
            {grupo.itens.map((item) => {
              const Icon = ICONS[item.icon] ?? Home;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={item.icon}
                  onClick={() => setAberto(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                    ativo(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground active:bg-secondary"
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}

      <div className="mx-auto flex max-w-6xl items-stretch gap-0.5 px-1 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {itens.map((item) => {
          const Icon = ICONS[item.icon] ?? Home;
          const on = ativo(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={item.icon}
              className={cn(
                "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[10px] font-medium transition-colors active:scale-95",
                on
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground active:bg-secondary"
              )}
            >
              <Icon className="size-6 shrink-0" strokeWidth={on ? 2.4 : 2} />
              <span className="w-full truncate text-center leading-none">
                {item.curto ?? item.label}
              </span>
            </Link>
          );
        })}

        {grupo && (
          <button
            type="button"
            data-tour="gestor"
            aria-haspopup="menu"
            aria-expanded={aberto}
            onClick={() => setAberto((v) => !v)}
            className={cn(
              "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[10px] font-medium transition-colors active:scale-95",
              grupoAtivo || aberto
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground active:bg-secondary"
            )}
          >
            {(() => {
              const Icon = ICONS[grupo.icon] ?? Settings;
              return (
                <Icon
                  className="size-6 shrink-0"
                  strokeWidth={grupoAtivo || aberto ? 2.4 : 2}
                />
              );
            })()}
            <span className="w-full truncate text-center leading-none">
              {grupo.curto ?? grupo.label}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
