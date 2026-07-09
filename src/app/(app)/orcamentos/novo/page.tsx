import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  modelosToldo,
  vendedores,
} from "@/db/schema";
import {
  FORMA_PAGAMENTO_PADRAO,
  GARANTIA_PADRAO,
  PRAZO_ENTREGA_PADRAO,
} from "@/lib/proposta";
import { vendedorDaSessao } from "@/lib/auth";
import { OrcamentoForm } from "@/components/shared/orcamento-form";

export default async function NovoOrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ atendimento?: string }>;
}) {
  const { atendimento } = await searchParams;

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

  // Se quem está logado é um vendedor, ele já vem como responsável
  const vendedorLogado = await vendedorDaSessao();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Novo orçamento</h1>
      <OrcamentoForm
        atendimentos={listaAtendimentos}
        modelos={modelos}
        vendedores={listaVendedores}
        vendedorPadrao={vendedorLogado?.id}
        vendedorFixo={vendedorLogado ?? undefined}
        atendimentoInicial={atendimento}
        padroes={{
          garantia: GARANTIA_PADRAO,
          formaPagamento: FORMA_PAGAMENTO_PADRAO,
          prazoEntrega: PRAZO_ENTREGA_PADRAO,
        }}
      />
    </div>
  );
}
