import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  modelosToldo,
  orcamentoItens,
  orcamentos,
  vendedores,
} from "@/db/schema";
import {
  FORMA_PAGAMENTO_PADRAO,
  GARANTIA_PADRAO,
  PRAZO_ENTREGA_PADRAO,
} from "@/lib/proposta";
import { centavosParaInput } from "@/lib/format";
import {
  OrcamentoForm,
  type OrcamentoInicial,
} from "@/components/shared/orcamento-form";

export default async function EditarOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orcamentoId = Number(id);
  if (!Number.isInteger(orcamentoId)) notFound();

  const orcamento = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
  });
  if (!orcamento) notFound();

  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, orcamentoId))
    .orderBy(asc(orcamentoItens.ordem));

  const listaAtendimentos = await db
    .select({
      id: atendimentos.id,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
    })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .orderBy(desc(atendimentos.atualizadoEm));

  const modelos = await db
    .select()
    .from(modelosToldo)
    .where(eq(modelosToldo.ativo, true))
    .orderBy(asc(modelosToldo.nome));

  const listaVendedores = await db
    .select({ id: vendedores.id, nome: vendedores.nome })
    .from(vendedores)
    .where(eq(vendedores.ativo, true))
    .orderBy(asc(vendedores.nome));

  // Estrutura legada 'ferro' passa a ser exibida/editada como 'metalica'
  const tipoEstrutura =
    orcamento.tipoEstrutura === "aluminio"
      ? "aluminio"
      : orcamento.tipoEstrutura
        ? "metalica"
        : "aluminio";

  const inicial: OrcamentoInicial = {
    id: orcamento.id,
    atendimentoId: orcamento.atendimentoId,
    modeloId: orcamento.modeloId,
    vendedorId: orcamento.vendedorId,
    tipoEstrutura,
    formato: orcamento.formato ?? "",
    descricaoMaterial: orcamento.descricaoMaterial ?? "",
    fixacaoVedacao: orcamento.fixacaoVedacao ?? "",
    garantiaTexto: orcamento.garantiaTexto ?? "",
    formaPagamento: orcamento.formaPagamento ?? "",
    prazoEntrega: orcamento.prazoEntrega ?? "",
    itens: itens.map((item) => ({
      descricao: item.descricao,
      valorMin: centavosParaInput(item.valorMin),
      valorMax: centavosParaInput(item.valorMax),
      subtitulo: item.valorMin === null,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link
          href={`/orcamentos/${orcamento.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Orçamento {orcamento.numero}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Editar orçamento {orcamento.numero}
        </h1>
      </div>
      <OrcamentoForm
        atendimentos={listaAtendimentos}
        modelos={modelos}
        vendedores={listaVendedores}
        orcamento={inicial}
        padroes={{
          garantia: GARANTIA_PADRAO,
          formaPagamento: FORMA_PAGAMENTO_PADRAO,
          prazoEntrega: PRAZO_ENTREGA_PADRAO,
        }}
      />
    </div>
  );
}
