import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  orcamentoItens,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
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

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "secondary" | "default" | "destructive" | "outline" }
> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  enviado: { label: "Enviado", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  recusado: { label: "Recusado", variant: "destructive" },
};

export default async function OrcamentosPage() {
  const usuario = await exigirUsuario();
  const ehGestor = usuario.papel === "gestor";
  // Vendedor vê só os próprios orçamentos.
  const escopo =
    !ehGestor && usuario.vendedorId != null
      ? eq(orcamentos.vendedorId, usuario.vendedorId)
      : undefined;

  const linhas = await db
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
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .where(escopo)
    .orderBy(desc(orcamentos.criadoEm));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
        <Button nativeButton={false} render={<Link href="/orcamentos/novo" />}>
          Novo orçamento
        </Button>
      </div>
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
                  Nenhum orçamento ainda.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((linha) => {
              const badge = STATUS_BADGE[linha.status];
              return (
                <TableRow key={linha.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/orcamentos/${linha.id}`}
                      className="hover:underline"
                    >
                      {linha.numero}
                    </Link>
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
