"use client";

import { useEffect, useState } from "react";
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
  // Imprimir e PDF saem do que está SALVO. Quem preenchia e clicava direto
  // levava papel desatualizado sem perceber; com alteração pendente os dois
  // ficam travados até salvar. O formulário (InstalacaoForm) avisa o sucesso
  // disparando "ficha-salva" no próprio <form>.
  const [alterada, setAlterada] = useState(false);

  useEffect(() => {
    const form = document.getElementById("form-ficha");
    if (!form) return;
    const marcar = () => setAlterada(true);
    const limpar = () => setAlterada(false);
    // Incluir/remover linha de produto é botão, não campo: não dispara input.
    const clique = (e: Event) => {
      if ((e.target as Element | null)?.closest('button[type="button"]')) marcar();
    };
    form.addEventListener("input", marcar);
    form.addEventListener("change", marcar);
    form.addEventListener("click", clique);
    form.addEventListener("ficha-salva", limpar);
    return () => {
      form.removeEventListener("input", marcar);
      form.removeEventListener("change", marcar);
      form.removeEventListener("click", clique);
      form.removeEventListener("ficha-salva", limpar);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="submit" form="form-ficha">
        Salvar ficha
      </Button>
      {alterada ? (
        // Botão nativo desabilitado, e não o link com disabled: link
        // "desabilitado" ainda navega em alguns navegadores.
        <>
          <Button variant="outline" disabled>
            <Printer className="size-4" /> Imprimir
          </Button>
          <Button variant="outline" disabled>
            <Download className="size-4" /> Baixar PDF
          </Button>
          <span className="text-xs text-muted-foreground">
            Salve antes de imprimir — a impressão sai da versão salva.
          </span>
        </>
      ) : (
        <>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/orcamentos/${orcamentoId}/ficha/imprimir`}
                target="_blank"
              />
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
        </>
      )}
    </div>
  );
}
