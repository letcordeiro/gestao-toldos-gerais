"use client";

import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Ações da ficha.
 *
 * "Imprimir" leva para uma página HTML própria que chama a janela de
 * impressão. Antes o botão tentava imprimir o PDF numa aba nova — e como
 * `window.open(..., "noopener")` devolve null, a impressão nunca era chamada:
 * só abria o PDF. Imprimindo HTML funciona em qualquer navegador, e o
 * "Salvar como PDF" já vem no próprio diálogo.
 */
export function AcoesFicha({
  orcamentoId,
  pdfUrl,
  nomeArquivo,
}: {
  orcamentoId: number;
  pdfUrl: string;
  nomeArquivo: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" form="form-ficha">
        Salvar ficha
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={
          <Link href={`/orcamentos/${orcamentoId}/ficha/imprimir`} target="_blank" />
        }
      >
        <Printer className="size-4" /> Imprimir
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={<a href={`${pdfUrl}?download=1`} download={nomeArquivo} />}
      >
        <Download className="size-4" /> Baixar PDF
      </Button>
    </div>
  );
}
