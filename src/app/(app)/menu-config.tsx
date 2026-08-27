"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ItemConfig = { href: string; label: string; ajuda: string };

/**
 * Tudo que se configura uma vez e quase não se mexe fica atrás desta
 * engrenagem. Antes, Fases e Avisos só existiam como botão dentro da tela de
 * Atendimentos — quem não soubesse disso nunca achava.
 */
export function MenuConfiguracoes({
  grupos,
}: {
  grupos: { titulo: string; itens: ItemConfig[] }[];
}) {
  const path = usePathname();
  const ativo = grupos.some((g) =>
    g.itens.some((i) => path === i.href || path.startsWith(`${i.href}/`))
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Configurações"
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              ativo
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Settings className="size-4" />
            Configurações
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        {grupos.map((grupo, i) => (
          <div key={grupo.titulo}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{grupo.titulo}</DropdownMenuLabel>
            {grupo.itens.map((item) => (
              <DropdownMenuItem
                key={item.href}
                render={<Link href={item.href} />}
              >
                <span className="flex flex-col">
                  <span className="text-sm">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.ajuda}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
