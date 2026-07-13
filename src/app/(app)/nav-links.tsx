"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon?: string };

// Links de navegação com destaque da página atual. Usado no header (desktop e mobile).
export function NavLinks({ itens }: { itens: Item[] }) {
  const path = usePathname();
  return (
    <>
      {itens.map((item) => {
        const ativo = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={item.icon}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              ativo
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
