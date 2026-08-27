import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cotacaoFornecedores, cotacoes } from "@/db/schema";
import { exigirComercial } from "@/lib/auth";
import { CotacaoForm } from "../../cotacao-form";
import {
  fornecedoresAtivos,
  itensDaCotacao,
  orcamentosParaCotacao,
} from "../../consulta";

export const metadata = { title: "Editar cotação" };

export default async function EditarCotacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirComercial();
  const { id } = await params;
  const cotacaoId = Number(id);
  if (!Number.isInteger(cotacaoId)) notFound();

  const cotacao = await db.query.cotacoes.findFirst({
    where: eq(cotacoes.id, cotacaoId),
  });
  if (!cotacao) notFound();

  const [fornecedores, orcamentos, itens, convites] = await Promise.all([
    fornecedoresAtivos(),
    orcamentosParaCotacao(),
    itensDaCotacao(cotacaoId),
    db
      .select({ fornecedorId: cotacaoFornecedores.fornecedorId })
      .from(cotacaoFornecedores)
      .where(eq(cotacaoFornecedores.cotacaoId, cotacaoId)),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link
          href={`/cotacoes/${cotacaoId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Cotação
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Editar cotação
        </h1>
        <p className="text-sm text-muted-foreground">
          Mudar a lista de material apaga as respostas já recebidas — o preço
          de antes não vale para outra lista.
        </p>
      </div>
      <CotacaoForm
        fornecedores={fornecedores}
        orcamentos={orcamentos}
        cotacao={{
          id: cotacao.id,
          titulo: cotacao.titulo,
          orcamentoId: cotacao.orcamentoId,
          prazoResposta: cotacao.prazoResposta,
          observacoes: cotacao.observacoes,
          observacoesInternas: cotacao.observacoesInternas,
          itens: itens.map((i) => ({
            descricao: i.descricao,
            quantidade: i.quantidade ?? "",
            unidade: i.unidade ?? "",
          })),
          fornecedorIds: convites.map((c) => c.fornecedorId),
        }}
      />
    </div>
  );
}
