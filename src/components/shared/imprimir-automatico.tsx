"use client";

import { useEffect, useRef } from "react";
import { Printer, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Abre a janela de impressão do navegador na própria página.
 *
 * Imprimir o PDF (embutido ou em aba nova) não funciona de forma confiável —
 * o Safari não expõe o print do visualizador e `window.open(..., "noopener")`
 * devolve null, então a impressão nunca era disparada. Imprimindo o HTML da
 * página, funciona em qualquer navegador e o "Salvar como PDF" já vem no
 * próprio diálogo de impressão.
 */
export function ImprimirAutomatico() {
  const router = useRouter();
  const jaTentou = useRef(false);

  useEffect(() => {
    if (jaTentou.current) return;
    jaTentou.current = true;
    // dá um instante para fontes e layout assentarem antes do diálogo
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mb-4 flex flex-wrap gap-2 print:hidden">
      <Button onClick={() => window.print()}>
        <Printer className="size-4" /> Imprimir
      </Button>
      <Button variant="outline" onClick={() => router.back()}>
        <X className="size-4" /> Fechar
      </Button>
      <p className="w-full text-sm text-muted-foreground sm:w-auto sm:self-center">
        No diálogo de impressão dá para escolher a impressora ou{" "}
        <strong>Salvar como PDF</strong>.
      </p>
    </div>
  );
}
