import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { nomeArquivoOrdem } from "@/lib/gerar-ordem-manutencao";
import { fichaPermitida } from "../ficha-dados";
import { FichaOrdem } from "../ficha-ordem";
import { AcoesOrdem } from "../acoes-ordem";

export const metadata = { title: "Ficha do chamado" };

/**
 * Ver a Ordem de Manutenção na tela, sem imprimir nada.
 *
 * Antes só dava para imprimir ou baixar: quem queria apenas CONFERIR o que
 * estava escrito na ficha caía na janela de impressão. Aqui a ficha aparece
 * do mesmo jeito que sai no papel, e as quatro ações ficam em cima dela.
 */
export default async function FichaChamadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chamadoId = Number(id);
  const carregada = await fichaPermitida(chamadoId);
  if (!carregada) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/chamados/${chamadoId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar ao chamado
        </Link>
        <h1 className="mt-1 font-heading text-xl">Ordem de Manutenção</h1>
        <p className="text-sm text-muted-foreground">
          {carregada.clienteNome} · sai em meia folha A4, para cortar no
          tracejado.
        </p>
      </div>

      <AcoesOrdem
        chamadoId={chamadoId}
        nomeArquivo={nomeArquivoOrdem(carregada.clienteNome)}
      />

      {/* A ficha tem largura de papel (210mm). Em tela estreita ela não
          encolhe — encolher mentiria sobre o que sai impresso —, então rola
          para o lado dentro da moldura. */}
      <div className="overflow-x-auto rounded-lg border bg-white p-2 shadow-sm">
        <div className="mx-auto w-[210mm]">
          <FichaOrdem d={carregada.dados} />
        </div>
      </div>
    </div>
  );
}
