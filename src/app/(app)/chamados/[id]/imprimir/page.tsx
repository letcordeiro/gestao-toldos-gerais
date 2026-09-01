import { notFound } from "next/navigation";
import Image from "next/image";
import { usuarioAtual } from "@/lib/auth";
import { dadosDaOrdem } from "@/lib/gerar-ordem-manutencao";
import { ImprimirAutomatico } from "@/components/shared/imprimir-automatico";

export const metadata = { title: "Ordem de manutenção" };

/**
 * A ficha para IMPRIMIR, em HTML.
 *
 * Existe porque celular não imprime PDF: o botão abria o arquivo e parava por
 * aí, sem diálogo de impressão. Imprimindo o HTML da página, o diálogo abre em
 * qualquer navegador — e nele já vem "Salvar como PDF" para quem quiser o
 * arquivo. O PDF continua existindo em /chamados/[id]/pdf, para mandar.
 *
 * O desenho é o mesmo do PDF: folha A4, ficha na METADE DE CIMA, tracejado no
 * meio para cortar. As medidas estão em mm de propósito — na impressão, mm é
 * o que o papel entende; px depende do zoom do navegador.
 */

/** Rótulo em negrito + linha sublinhada, com ou sem valor. */
function Campo({
  rotulo,
  valor,
  largura,
}: {
  rotulo: string;
  valor?: string | null;
  /** Largura fixa (ex.: "34mm") para os campos curtos; sem isso, ocupa o resto. */
  largura?: string;
}) {
  return (
    <span
      className="flex items-end gap-1"
      style={largura ? { width: largura, flex: "none" } : { flex: "1 1 0%" }}
    >
      <span className="whitespace-nowrap font-bold">{rotulo}</span>
      <span className="min-h-[13px] flex-1 border-b border-neutral-700 leading-tight">
        {valor || " "}
      </span>
    </span>
  );
}

function Caixa({ marcada, rotulo }: { marcada: boolean; rotulo: string }) {
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <span className="flex size-[9px] items-center justify-center border border-neutral-700 text-[7px] font-bold leading-none">
        {marcada ? "X" : " "}
      </span>
      {rotulo}
    </span>
  );
}

export default async function ImprimirOrdemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chamadoId = Number(id);
  if (!Number.isInteger(chamadoId)) notFound();

  const usuario = await usuarioAtual();
  if (!usuario) notFound();

  const carregada = await dadosDaOrdem(chamadoId);
  if (!carregada) notFound();

  // Mesma regra do PDF: vendedor só imprime a ficha dos próprios clientes.
  if (
    usuario.papel === "vendedor" &&
    carregada.vendedorId !== usuario.vendedorId
  ) {
    notFound();
  }
  const d = carregada.dados;

  return (
    <div className="mx-auto max-w-[210mm]">
      <ImprimirAutomatico />

      <div className="bg-white text-[9pt] text-neutral-900 print:text-black">
        {/* A metade de cima da A4. Altura fixa: é o que garante que o corte
            caia no meio da folha, com ficha cheia ou vazia. */}
        <div className="flex h-[141mm] flex-col border-b border-dashed border-neutral-400 px-[8mm] pt-[6mm]">
          <div className="mb-3 flex items-center justify-between">
            <Image src="/logo.png" alt="Toldos Gerais" width={82} height={44} />
            <p className="text-[15pt] font-bold text-[#004e36]">
              Ordem de Manutenção
            </p>
            <p className="text-[7.5pt] text-neutral-500">
              {d.numero ? `Orçamento ${d.numero}` : " "}
            </p>
          </div>

          <div className="mb-3 flex items-end gap-4">
            <Campo rotulo="Nome:" valor={d.clienteNome} />
            <Campo rotulo="Tel:" valor={d.clienteTelefone} largura="52mm" />
          </div>

          <div className="mb-3 flex items-end gap-4">
            <Campo rotulo="End.:" valor={d.endereco} />
          </div>

          <div className="mb-3 flex items-end gap-4">
            <Campo
              rotulo="Data da instalação:"
              valor={d.dataInstalacao}
              largura="55mm"
            />
            <span className="flex items-center gap-2">
              <Caixa marcada={d.naGarantia === true} rotulo="com garantia" />
              <span>/</span>
              <Caixa marcada={d.naGarantia === false} rotulo="sem garantia" />
            </span>
          </div>

          <div className="mb-3 flex items-end gap-4">
            <Campo rotulo="Vendedor:" valor={d.vendedor} />
            <Campo rotulo="Valor:" valor={d.valor} largura="42mm" />
          </div>

          <div className="mb-3 flex items-end gap-4">
            <Campo
              rotulo="Data da ligação:"
              valor={d.dataLigacao}
              largura="50mm"
            />
            <Campo rotulo="Instalador:" valor={d.instalador} />
          </div>

          <div className="mb-3 flex items-end gap-3">
            <Caixa marcada={d.tipoServico === "vedacao"} rotulo="Vedação" />
            <Caixa marcada={d.tipoServico === "outros"} rotulo="Outros" />
            <span className="min-h-[13px] flex-1 border-b border-neutral-700">
              {d.tipoServico === "outros" ? d.servicoOutros || " " : " "}
            </span>
          </div>

          <div className="mb-3 flex items-end gap-4">
            <Campo
              rotulo="Data da ida ao local:"
              valor={d.dataVisita}
              largura="55mm"
            />
          </div>

          {/* Linhas de escrita: o relato entra impresso e o resto fica em
              branco para o instalador anotar o que encontrou no local. */}
          {d.linhasRelato.map((texto, i) => (
            <p
              key={i}
              className="mb-3 min-h-[13px] border-b border-neutral-700 leading-tight"
            >
              {texto || " "}
            </p>
          ))}

          <div className="mt-auto mb-[5mm] flex items-end gap-4">
            <Campo rotulo="Assinatura do Cliente:" />
          </div>
        </div>

        <p className="pt-1 text-center text-[6pt] text-neutral-400">
          corte aqui
        </p>
      </div>

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
