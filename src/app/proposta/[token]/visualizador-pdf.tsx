"use client";

import { useEffect, useRef, useState } from "react";

// Renderiza o PDF direto na página (PDF.js) — funciona em qualquer navegador,
// inclusive o interno do WhatsApp, que não exibe PDF cru.
export function VisualizadorPdf({
  url,
  downloadName,
}: {
  url: string;
  downloadName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">(
    "carregando"
  );

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjs.getDocument({ url }).promise;
        const container = containerRef.current;
        if (cancelado || !container) return;
        container.innerHTML = "";

        const largura = Math.min(container.clientWidth || 800, 900);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelado) return;
          const base = page.getViewport({ scale: 1 });
          const escala = (largura / base.width) * dpr;
          const viewport = page.getViewport({ scale: escala });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.className = "mb-3 w-full rounded-md border bg-white shadow-sm";
          container.appendChild(canvas);

          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
        }
        if (!cancelado) setEstado("ok");
      } catch {
        if (!cancelado) setEstado("erro");
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [url]);

  return (
    <div className="w-full">
      {estado === "carregando" && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Carregando a proposta…
        </p>
      )}
      {estado === "erro" && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Não foi possível exibir aqui.{" "}
          <a
            href={url}
            download={downloadName}
            className="font-medium text-primary underline"
          >
            Baixe o PDF
          </a>
          .
        </p>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
