import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, clientes, fases, orcamentos } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { VisualizadorImpressao } from "./visualizador";

export default async function ImprimirOrcamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doc?: string }>;
}) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const { doc } = await searchParams;
  const ehFicha = doc === "ficha";

  const orcamentoId = Number(id);
  if (!Number.isInteger(orcamentoId)) notFound();

  const [linha] = await db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      vendedorId: orcamentos.vendedorId,
      clienteNome: clientes.nome,
      faseLibera: fases.liberaInstalacao,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .where(eq(orcamentos.id, orcamentoId));

  if (!linha) notFound();
  if (usuario.papel === "vendedor" && linha.vendedorId !== usuario.vendedorId) {
    notFound();
  }
  // A ficha só existe depois que o negócio fecha.
  if (ehFicha && !linha.faseLibera) notFound();

  const pdfUrl = ehFicha
    ? `/orcamentos/${linha.id}/ficha/pdf`
    : `/orcamentos/${linha.id}/pdf`;
  const arquivo = ehFicha
    ? `ficha-instalacao-${linha.numero}.pdf`
    : `orcamento-${linha.numero}.pdf`;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/orcamentos/${linha.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar ao orçamento
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {ehFicha
            ? `Ficha de instalação — ${linha.numero}`
            : `Orçamento ${linha.numero}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {linha.clienteNome}
          {ehFicha
            ? " · uso interno da equipe, o cliente não recebe"
            : " · é este documento que o cliente recebe"}
        </p>
      </div>
      <VisualizadorImpressao
        pdfUrl={pdfUrl}
        nomeArquivo={arquivo}
        rotulo={ehFicha ? "ficha de instalação" : "orçamento"}
      />
    </div>
  );
}
