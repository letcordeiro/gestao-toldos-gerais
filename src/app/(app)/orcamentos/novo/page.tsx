import Link from "next/link";
import { asc, desc, eq, and, ne } from "drizzle-orm";
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
import { exigirOrcamento, vendedorDaSessao } from "@/lib/auth";
import { OrcamentoForm } from "@/components/shared/orcamento-form";

export const metadata = { title: "Novo orçamento" };


export default async function NovoOrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ atendimento?: string }>;
}) {
  const usuario = await exigirOrcamento();
  const { atendimento } = await searchParams;

  const listaAtendimentos = await db
    .select({
      id: atendimentos.id,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      vendedorId: atendimentos.vendedorId,
    })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .orderBy(desc(atendimentos.atualizadoEm));

  const modelos = await db
    .select()
    .from(modelosToldo)
    .where(eq(modelosToldo.ativo, true))
    .orderBy(asc(modelosToldo.nome));

  // Atendente não é responsável de orçamento: fica fora da lista.
  const listaVendedores = await db
    .select({ id: vendedores.id, nome: vendedores.nome })
    .from(vendedores)
    .where(and(eq(vendedores.ativo, true), ne(vendedores.papel, "atendente")))
    .orderBy(asc(vendedores.nome));

  // Vendedor logado já vem fixo como responsável. A ATENDENTE escolhe — e o
  // padrão é o vendedor do cliente, para o orçamento não sair no nome dela.
  const vendedorLogado =
    usuario.papel === "atendente" ? null : await vendedorDaSessao();
  let vendedorDoCliente: number | undefined;
  if (usuario.papel === "atendente" && Number(atendimento) > 0) {
    const at = await db.query.atendimentos.findFirst({
      where: eq(atendimentos.id, Number(atendimento)),
      columns: { vendedorId: true },
    });
    vendedorDoCliente = at?.vendedorId ?? undefined;
  }

  const voltaAtendimento = Number.isInteger(Number(atendimento)) && Number(atendimento) > 0
    ? Number(atendimento)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Única tela filha que não tinha volta. Vindo de um atendimento, volta
          para ele — é de lá que a pessoa desistiu. */}
      <Link
        href={voltaAtendimento ? `/atendimentos/${voltaAtendimento}` : "/orcamentos"}
        className="text-sm text-muted-foreground hover:underline"
      >
        {voltaAtendimento ? "← Atendimento" : "← Orçamentos"}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Novo orçamento</h1>
      <OrcamentoForm
        atendimentos={listaAtendimentos}
        modelos={modelos}
        vendedores={listaVendedores}
        vendedorPadrao={vendedorLogado?.id ?? vendedorDoCliente}
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
