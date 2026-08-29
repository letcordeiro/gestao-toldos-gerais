"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ItemMenu = { href: string; label: string; ajuda: string };
export type GrupoMenu = { titulo: string; itens: ItemMenu[] };

/**
 * Menu suspenso da barra de cima. Usado duas vezes: "Mais" (telas de uso
 * semanal) e "Configurações" (o que se ajusta uma vez). Sem isso a barra
 * passava de oito itens e nenhum deles se destacava.
 */
export function MenuSuspenso({
  rotulo,
  grupos,
  icone: Icone,
}: {
  rotulo: string;
  grupos: GrupoMenu[];
  icone?: LucideIcon;
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
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              ativo
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {Icone ? <Icone className="size-4" /> : null}
            {rotulo}
            {Icone ? null : <ChevronDown className="size-3.5" />}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        {grupos.map((grupo, i) => (
          // O rótulo TEM de estar dentro de um Group: o GroupLabel do Base UI
          // lança exceção sem esse ancestral, e o menu inteiro morre ao abrir.
          // Ficou latente enquanto o grupo "Mais" não tinha título (29/08/2026).
          <Fragment key={grupo.titulo}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              {grupo.titulo && (
                <DropdownMenuLabel>{grupo.titulo}</DropdownMenuLabel>
              )}
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
            </DropdownMenuGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

