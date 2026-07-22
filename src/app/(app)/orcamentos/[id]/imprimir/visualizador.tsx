"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Impressão do orçamento.
 *
 * No computador: embute o PDF e chama a janela de impressão sozinho.
 * No celular: NÃO embute — iPhone/Android não renderizam PDF em iframe de
 * forma confiável e o usuário ficaria olhando uma caixa vazia. Lá o caminho é
 * abrir o PDF e usar o "compartilhar → imprimir" do próprio aparelho.
 *
 * O botão Imprimir fica sempre visível: se o navegador bloquear a impressão
 * automática, ninguém fica sem saída.
 */
export function VisualizadorImpressao({
  pdfUrl,
  numero,
}: {
  pdfUrl: string;
  numero: string;
}) {
  const quadro = useRef<HTMLIFrameElement>(null);
  const [carregado, setCarregado] = useState(false);
  const jaTentou = useRef(false);

  function imprimir() {
    const janela = quadro.current?.contentWindow;
    if (!janela) {
      window.open(pdfUrl, "_blank", "noopener");
      return;
    }
    try {
      janela.focus();
      janela.print();
    } catch {
      window.open(pdfUrl, "_blank", "noopener");
    }
  }

  // Impressão automática só no computador (onde o iframe de PDF funciona).
  useEffect(() => {
    if (!carregado || jaTentou.current) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    jaTentou.current = true;
    const t = setTimeout(imprimir, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregado]);

  const baixarUrl = `${pdfUrl}?download=1`;

  return (
    <div className="flex flex-col gap-3 md:h-[calc(100vh-9rem)]">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={imprimir}>
          <Printer className="size-4" /> Imprimir
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={baixarUrl} download={`orcamento-${numero}.pdf`} />}
        >
          <Download className="size-4" /> Salvar PDF
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={pdfUrl} target="_blank" rel="noopener" />}
        >
          <ExternalLink className="size-4" /> Abrir PDF
        </Button>
      </div>

      <p className="hidden text-sm text-muted-foreground md:block">
        A janela de impressão abre sozinha. Se não abrir, use o botão Imprimir.
      </p>

      {/* Celular: sem iframe — instrução do caminho que funciona no aparelho */}
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground md:hidden">
        <p className="font-medium text-foreground">Imprimindo pelo celular</p>
        <p className="mt-1 leading-relaxed">
          Toque em <strong>Abrir PDF</strong>. Quando o orçamento aparecer, use
          o botão de compartilhar do celular e escolha{" "}
          <strong>Imprimir</strong>. Para guardar o arquivo, use{" "}
          <strong>Salvar PDF</strong>.
        </p>
      </div>

      {/* Computador: PDF embutido */}
      <iframe
        ref={quadro}
        src={pdfUrl}
        title={`Orçamento ${numero}`}
        onLoad={() => setCarregado(true)}
        className="hidden min-h-0 w-full flex-1 rounded-lg border bg-card md:block"
      />
    </div>
  );
}
