import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, clientes, orcamentos } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { VisualizadorImpressao } from "./visualizador";

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
      id: orcamentos.id,
      numero: orcamentos.numero,
      status: orcamentos.status,
      vendedorId: orcamentos.vendedorId,
      clienteNome: clientes.nome,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(eq(orcamentos.id, orcamentoId));

  if (!linha) notFound();
  // Vendedor só imprime os próprios orçamentos (mesma regra do PDF).
  if (usuario.papel === "vendedor" && linha.vendedorId !== usuario.vendedorId) {
    notFound();
  }

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
          Imprimir orçamento {linha.numero}
        </h1>
        <p className="text-sm text-muted-foreground">
          {linha.clienteNome}
          {linha.status === "aprovado"
            ? " · inclui a ficha de instalação na página 2"
            : ""}
        </p>
      </div>
      <VisualizadorImpressao
        pdfUrl={`/orcamentos/${linha.id}/pdf`}
        numero={linha.numero}
      />
    </div>
  );
}
