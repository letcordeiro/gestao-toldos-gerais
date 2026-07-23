import Image from "next/image";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  modelosToldo,
  orcamentoItens,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { enderecoCompleto } from "@/lib/endereco";
import { formatarValorItem } from "@/lib/format";
import { rotuloEstrutura, rotuloFormato } from "@/lib/labels";
import { MONTAGEM_COBERTURA } from "@/lib/proposta";
import { ImprimirAutomatico } from "../ficha/imprimir/imprimir-automatico";

function Secao({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <div className="mb-2.5">
      <h3 className="text-[10px] font-bold tracking-wide text-[#004e36]">
        {titulo}
      </h3>
      <p className="whitespace-pre-line text-[11px] leading-snug">{texto}</p>
    </div>
  );
}

export default async function ImprimirOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const orcamentoId = Number(id);
  if (!Number.isInteger(orcamentoId)) notFound();

  const [linha] = await db
    .select({
      orc: orcamentos,
      cliente: clientes,
      modeloNome: modelosToldo.nome,
      vendedor: vendedores,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(modelosToldo, eq(orcamentos.modeloId, modelosToldo.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .where(eq(orcamentos.id, orcamentoId));

  if (!linha) notFound();
  if (
    usuario.papel === "vendedor" &&
    linha.orc.vendedorId !== usuario.vendedorId
  ) {
    notFound();
  }

  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, orcamentoId))
    .orderBy(asc(orcamentoItens.ordem));

  const { orc, cliente, vendedor } = linha;
  const endereco = enderecoCompleto(cliente);
  const modeloTexto = linha.modeloNome
    ? orc.formato
      ? `${linha.modeloNome} — Formato: ${rotuloFormato(orc.formato)}`
      : linha.modeloNome
    : null;

  return (
    <div className="mx-auto max-w-[210mm]">
      <ImprimirAutomatico />

      <div className="folha rounded-lg border bg-white p-[12mm] text-black shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-neutral-200 pb-2">
          <Image src="/logo.png" alt="Toldos Gerais" width={100} height={54} />
          <p className="text-right text-[11px] font-bold text-[#004e36]">
            PROPOSTA TÉCNICA
            <br />
            COMERCIAL Nº {orc.numero}
          </p>
        </div>

        <p className="mb-2 text-[11px] text-neutral-600">
          Belo Horizonte,{" "}
          {format(orc.criadoEm, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.
        </p>

        <div className="mb-3 border-b border-neutral-200 pb-2 text-[11px]">
          <p className="font-semibold">
            A/c de {cliente.nome} — {cliente.telefone}
          </p>
          {endereco ? <p className="text-neutral-600">{endereco}</p> : null}
        </div>

        <Secao titulo="MODELO" texto={modeloTexto} />
        <Secao titulo="DESCRIÇÃO DO MATERIAL" texto={orc.descricaoMaterial} />
        <Secao
          titulo="ESTRUTURA"
          texto={rotuloEstrutura(orc.tipoEstrutura) || null}
        />
        <Secao
          titulo="FIXAÇÃO E VEDAÇÃO DA ESTRUTURA"
          texto={orc.fixacaoVedacao}
        />
        <Secao titulo="MONTAGEM DA COBERTURA" texto={MONTAGEM_COBERTURA} />
        <Secao titulo="GARANTIA" texto={orc.garantiaTexto} />

        <div className="mb-2.5">
          <h3 className="mb-1 text-[10px] font-bold tracking-wide text-[#004e36]">
            VALOR DO ORÇAMENTO
          </h3>
          {itens.map((item) =>
            item.valorMin == null ? (
              <p key={item.id} className="mt-1 text-[11px] italic">
                {item.descricao}
              </p>
            ) : (
              <div key={item.id} className="flex items-end gap-1 text-[11px]">
                <span>{item.descricao}</span>
                <span className="mb-[3px] flex-1 border-b border-dotted border-neutral-400" />
                <span className="font-bold">
                  {formatarValorItem(item.valorMin, item.valorMax)}
                </span>
              </div>
            )
          )}
        </div>

        <div className="mb-3 flex gap-6">
          <div className="flex-1">
            <Secao titulo="FORMA DE PAGAMENTO" texto={orc.formaPagamento} />
          </div>
          <div className="flex-1">
            <Secao titulo="PRAZO DE ENTREGA" texto={orc.prazoEntrega} />
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-2 text-center text-[9px] text-neutral-500">
          {vendedor ? (
            <>
              <p className="font-bold text-[#004e36]">
                {vendedor.nome} · Vendedor responsável — Toldos Gerais
              </p>
              <p>
                {[
                  vendedor.whatsapp ? `WhatsApp ${vendedor.whatsapp}` : null,
                  vendedor.telefoneFixo ? `Fixo ${vendedor.telefoneFixo}` : null,
                  vendedor.email,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>
            </>
          ) : null}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { background: #fff !important; }
          header, nav, footer { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
