import { notFound } from "next/navigation";
import { ImprimirAutomatico } from "@/components/shared/imprimir-automatico";
import { fichaPermitida } from "../ficha-dados";
import { FichaOrdem } from "../ficha-ordem";

export const metadata = { title: "Ordem de manutenção" };

/**
 * A ficha para IMPRIMIR, em HTML.
 *
 * Existe porque celular não imprime PDF: o botão abria o arquivo e parava por
 * aí, sem diálogo de impressão. Imprimindo o HTML da página, o diálogo abre em
 * qualquer navegador — e nele já vem "Salvar como PDF" para quem quiser o
 * arquivo. O PDF continua existindo em /chamados/[id]/pdf, para mandar.
 *
 * Quem só quer OLHAR a ficha usa /chamados/[id]/ficha: esta aqui abre a
 * janela de impressão sozinha.
 */
export default async function ImprimirOrdemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const carregada = await fichaPermitida(Number(id));
  if (!carregada) notFound();

  return (
    <div className="mx-auto max-w-[210mm]">
      <ImprimirAutomatico />
      <FichaOrdem d={carregada.dados} />

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #fff !important; }
          header, nav, footer { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
