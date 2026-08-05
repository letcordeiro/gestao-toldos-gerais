import { notFound } from "next/navigation";
import Image from "next/image";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contratos, orcamentos } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { carregarDadosContrato } from "@/lib/gerar-contrato";
import { ContratoPreview } from "@/components/shared/contrato-preview";
import { ImprimirAutomatico } from "../../../orcamentos/[id]/ficha/imprimir/imprimir-automatico";

export const metadata = { title: "Imprimir contrato" };

/**
 * Impressão do contrato pelo HTML (não pelo PDF): o diálogo do navegador abre
 * em qualquer aparelho e já traz "Salvar como PDF". Mesma escolha feita na
 * proposta e na ficha de instalação.
 */
export default async function ImprimirContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const contratoId = Number(id);
  if (!Number.isInteger(contratoId)) notFound();

  const [linha] = await db
    .select({ contrato: contratos, orcamento: orcamentos })
    .from(contratos)
    .innerJoin(orcamentos, eq(contratos.orcamentoId, orcamentos.id))
    .where(eq(contratos.id, contratoId));
  if (!linha) notFound();
  if (
    usuario.papel === "vendedor" &&
    linha.orcamento.vendedorId !== usuario.vendedorId
  ) {
    notFound();
  }

  const carregado = await carregarDadosContrato(eq(contratos.id, contratoId));
  if (!carregado) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <ImprimirAutomatico />

      <div className="rounded-lg border bg-white p-6 print:rounded-none print:border-0 print:p-0">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <Image src="/logo.png" alt="Toldos Gerais" width={90} height={48} />
        </div>
        <ContratoPreview dados={carregado.dados} />
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: #fff !important; }
          header, nav, footer { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
