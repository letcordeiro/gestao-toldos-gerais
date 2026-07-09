"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";

// Linha de tabela em que clicar em qualquer célula abre o destino.
export function LinhaClicavel({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <TableRow
      onClick={() => router.push(href)}
      className="cursor-pointer transition-colors hover:bg-secondary/60"
    >
      {children}
    </TableRow>
  );
}
