"use client";

import { useState } from "react";
import { Download, FileText, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * O que dá para fazer com a Ordem de Manutenção.
 *
 * São quatro coisas diferentes e cada uma tem um dono: imprimir é para o
 * instalador levar o papel; ver o PDF é para conferir antes de mandar; baixar
 * é para guardar; compartilhar é para cair no WhatsApp de quem vai à obra.
 *
 * "Imprimir" leva para uma página HTML própria, nunca para o PDF: celular
 * abre o PDF e para por aí, sem janela de impressão. Imprimindo HTML o
 * diálogo abre em qualquer navegador — e o "Salvar como PDF" já vem nele.
 */
export function AcoesOrdem({
  chamadoId,
  nomeArquivo,
}: {
  chamadoId: number;
  nomeArquivo: string;
}) {
  const [compartilhando, setCompartilhando] = useState(false);
  const pdf = `/chamados/${chamadoId}/pdf`;

  /**
   * Compartilhar manda o ARQUIVO, não o link: o link só abre para quem tem
   * login no sistema, e quem recebe a ficha normalmente é o instalador, que
   * não tem. Navegador que não sabe compartilhar arquivo (quase todo
   * navegador de computador) baixa o PDF e avisa — é o mesmo destino em dois
   * passos, e melhor do que um botão que não faz nada.
   */
  async function compartilhar() {
    setCompartilhando(true);
    try {
      const resposta = await fetch(pdf);
      if (!resposta.ok) throw new Error("não deu para gerar o PDF");
      const arquivo = new File([await resposta.blob()], nomeArquivo, {
        type: "application/pdf",
      });

      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({
          files: [arquivo],
          title: "Ordem de Manutenção",
        });
        return;
      }

      const url = URL.createObjectURL(arquivo);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF baixado — agora é só anexar onde você quiser.", {
        description: "Este navegador não compartilha arquivo direto.",
      });
    } catch (erro) {
      // Fechar a janela de compartilhamento não é erro: não avisa nada.
      if (erro instanceof DOMException && erro.name === "AbortError") return;
      toast.error("Não deu para compartilhar a ficha. Tente baixar o PDF.");
    } finally {
      setCompartilhando(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        nativeButton={false}
        render={
          <a
            href={`/chamados/${chamadoId}/imprimir`}
            target="_blank"
            rel="noopener"
          />
        }
      >
        <Printer className="size-4" /> Imprimir
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={<a href={pdf} target="_blank" rel="noopener" />}
      >
        <FileText className="size-4" /> Ver PDF
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={<a href={`${pdf}?download=1`} download={nomeArquivo} />}
      >
        <Download className="size-4" /> Baixar PDF
      </Button>
      <Button onClick={compartilhar} disabled={compartilhando}>
        <Share2 className="size-4" />
        {compartilhando ? "Preparando…" : "Compartilhar"}
      </Button>
    </div>
  );
}
