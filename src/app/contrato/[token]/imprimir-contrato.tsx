"use client";

import { Printer } from "lucide-react";

/**
 * Imprime a própria página (o contrato já está renderizado em HTML).
 * O diálogo do navegador traz "Salvar como PDF" — funciona no celular também.
 */
export function ImprimirContrato() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-secondary"
    >
      <Printer className="size-4" /> Imprimir
    </button>
  );
}
