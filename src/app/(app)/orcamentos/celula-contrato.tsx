"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type StatusContrato } from "@/lib/contratos";
import { TableCell } from "@/components/ui/table";

const VARIANTE: Record<
  StatusContrato,
  "secondary" | "default" | "destructive" | "outline"
> = {
  rascunho: "outline",
  emitido: "secondary",
  assinado: "default",
  aditivado: "default",
  cancelado: "destructive",
};

/**
 * Célula do contrato dentro de uma linha clicável.
 *
 * Precisa ser componente de cliente por causa do `stopPropagation`: sem ele,
 * clicar no selo dispararia o clique da linha (que abre o orçamento) junto com
 * o link (que abre o contrato) — e o orçamento ganharia a corrida.
 */
export function CelulaContrato({
  contratoId,
  numero,
  status,
}: {
  contratoId: number | null;
  numero: string | null;
  status: string | null;
}) {
  if (contratoId == null || status == null) {
    return (
      <TableCell>
        <span className="text-muted-foreground">—</span>
      </TableCell>
    );
  }
  return (
    <TableCell onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/contratos/${contratoId}`}
        className="inline-flex flex-col gap-0.5 hover:opacity-80"
      >
        <Badge variant={VARIANTE[status as StatusContrato]}>
          {STATUS_LABEL[status as StatusContrato]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {numero ?? "sem número"}
        </span>
      </Link>
    </TableCell>
  );
}
