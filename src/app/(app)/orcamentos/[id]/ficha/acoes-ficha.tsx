"use client";

import { Download, ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Imprimir/baixar a ficha. Abre o PDF numa aba e manda imprimir de lá —
 * imprimir PDF embutido em iframe é instável (e no celular nem renderiza),
 * então o caminho confiável é o visualizador do próprio navegador.
 */
export function AcoesFicha({
  pdfUrl,
  nomeArquivo,
}: {
  pdfUrl: string;
  nomeArquivo: string;
}) {
  function imprimir() {
    const aba = window.open(pdfUrl, "_blank", "noopener");
    if (!aba) return;
    // Alguns navegadores aceitam disparar a impressão assim que o PDF carrega;
    // se bloquearem, o usuário usa o botão de imprimir do próprio visualizador.
    aba.addEventListener?.("load", () => {
      try {
        aba.print();
      } catch {
        /* visualizador cuida */
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" form="form-ficha">
        Salvar ficha
      </Button>
      <Button variant="outline" onClick={imprimir}>
        <Printer className="size-4" /> Imprimir
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={
          <a href={`${pdfUrl}?download=1`} download={nomeArquivo} />
        }
      >
        <Download className="size-4" /> Baixar PDF
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={<a href={pdfUrl} target="_blank" rel="noopener" />}
      >
        <ExternalLink className="size-4" /> Abrir PDF
      </Button>
    </div>
  );
}
