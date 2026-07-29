import Link from "next/link";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  orcamentoItens,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarCentavos } from "@/lib/format";
import { LinhaClicavel } from "./linha-clicavel";

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "secondary" | "default" | "destructive" | "outline" }
> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  enviado: { label: "Enviado", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  recusado: { label: "Recusado", variant: "destructive" },
};

// Ordem de exibição dos cards e cor de identificação de cada status.
const STATUS_CARDS: { chave: string; label: string; cor: string }[] = [
  { chave: "rascunho", label: "Rascunho", cor: "#9CA3AF" },
  { chave: "enviado", label: "Enviados", cor: "#D97706" },
  { chave: "aprovado", label: "Aprovados", cor: "#004E36" },
  { chave: "recusado", label: "Recusados", cor: "#DC2626" },
];

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const statusFiltro =
    statusParam && statusParam in STATUS_BADGE ? statusParam : undefined;

  const usuario = await exigirUsuario();
  const ehGestor = usuario.papel === "gestor";
  // Vendedor vê só os próprios orçamentos.
  const escopo =
    !ehGestor && usuario.vendedorId != null
      ? eq(orcamentos.vendedorId, usuario.vendedorId)
      : undefined;

  const todos = await db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      status: orcamentos.status,
      criadoEm: orcamentos.criadoEm,
      clienteNome: clientes.nome,
      vendedorNome: vendedores.nome,
      total: sql<number | null>`(
        select sum(${orcamentoItens.valorMin})
        from ${orcamentoItens}
        where ${orcamentoItens.orcamentoId} = ${orcamentos.id}
      )`,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    // Cliente inativo e atendimento concluído saem daqui — ficam visíveis
    // apenas no histórico do cliente (/cadastros/clientes/[id]).
    .where(
      and(
        escopo,
        eq(clientes.ativo, true),
        ne(fases.nome, "Concluído")
      )
    )
    .orderBy(desc(orcamentos.criadoEm));

  // Resumo por status (contagem + valor) calculado sobre a lista inteira,
  // independente do filtro ativo.
  const resumo = new Map<string, { n: number; valor: number }>();
  for (const o of todos) {
    const r = resumo.get(o.status) ?? { n: 0, valor: 0 };
    r.n += 1;
    r.valor += o.total ?? 0;
    resumo.set(o.status, r);
  }

  // Visão padrão mostra só o que está em jogo: recusado sai da lista e fica
  // atrás do card "Recusados" (contagem e valor continuam visíveis nele).
  const linhas = statusFiltro
    ? todos.filter((o) => o.status === statusFiltro)
    : todos.filter((o) => o.status !== "recusado");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
        <Button nativeButton={false} render={<Link href="/orcamentos/novo" />}>
          Novo orçamento
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {STATUS_CARDS.map((card) => {
          const r = resumo.get(card.chave) ?? { n: 0, valor: 0 };
          const ativo = statusFiltro === card.chave;
          return (
            <Link
              key={card.chave}
              // Clicar no card ativo limpa o filtro.
              href={ativo ? "/orcamentos" : `/orcamentos?status=${card.chave}`}
              className={cn(
                "rounded-lg border bg-card p-3 transition-colors hover:bg-secondary/50",
                ativo && "border-primary ring-1 ring-primary"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: card.cor }}
                />
                {card.label}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {r.n}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {r.n > 0 ? formatarCentavos(r.valor) : "—"}
              </div>
            </Link>
          );
        })}
      </div>

      {statusFiltro && (
        <p className="text-sm text-muted-foreground">
          Mostrando só{" "}
          <span className="font-medium text-foreground">
            {STATUS_BADGE[statusFiltro].label.toLowerCase()}
          </span>{" "}
          ({linhas.length}) ·{" "}
          <Link href="/orcamentos" className="text-primary hover:underline">
            limpar filtro
          </Link>
        </p>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              {ehGestor && (
                <TableHead className="hidden sm:table-cell">Vendedor</TableHead>
              )}
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Total (a partir de)</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={ehGestor ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {statusFiltro
                    ? `Nenhum orçamento ${STATUS_BADGE[
                        statusFiltro
                      ].label.toLowerCase()} em andamento.`
                    : "Nenhum orçamento em andamento. Orçamentos de atendimentos concluídos e de clientes inativos ficam no histórico do cliente."}
                </TableCell>
              </TableRow>
            )}
            {linhas.map((linha) => {
              const badge = STATUS_BADGE[linha.status];
              return (
                <LinhaClicavel key={linha.id} href={`/orcamentos/${linha.id}`}>
                  <TableCell className="font-medium text-primary">
                    {linha.numero}
                  </TableCell>
                  <TableCell>{linha.clienteNome}</TableCell>
                  {ehGestor && (
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {linha.vendedorNome ?? "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {linha.total != null ? formatarCentavos(linha.total) : "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {format(linha.criadoEm, "dd/MM/yyyy")}
                  </TableCell>
                </LinhaClicavel>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
