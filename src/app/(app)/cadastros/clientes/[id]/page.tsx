import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarCentavos } from "@/lib/format";
import { LinhaClicavel } from "../../../orcamentos/linha-clicavel";

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "secondary" | "default" | "destructive" | "outline" }
> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  enviado: { label: "Enviado", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  recusado: { label: "Recusado", variant: "destructive" },
};

export default async function HistoricoClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clienteId = Number(id);
  if (!Number.isInteger(clienteId) || clienteId <= 0) notFound();

  const usuario = await exigirUsuario();
  const ehGestor = usuario.papel === "gestor";

  const cliente = await db.query.clientes.findFirst({
    where: eq(clientes.id, clienteId),
  });
  if (!cliente) notFound();

  // Vendedor vê só os atendimentos/orçamentos dele; gestor vê tudo.
  const escopoAtendimento =
    !ehGestor && usuario.vendedorId != null
      ? eq(atendimentos.vendedorId, usuario.vendedorId)
      : undefined;

  const listaAtendimentos = await db
    .select({
      id: atendimentos.id,
      criadoEm: atendimentos.criadoEm,
      faseNome: fases.nome,
      faseCor: fases.cor,
      vendedorNome: vendedores.nome,
    })
    .from(atendimentos)
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .leftJoin(vendedores, eq(atendimentos.vendedorId, vendedores.id))
    .where(and(eq(atendimentos.clienteId, clienteId), escopoAtendimento))
    .orderBy(desc(atendimentos.criadoEm));

  const escopoOrcamento =
    !ehGestor && usuario.vendedorId != null
      ? eq(orcamentos.vendedorId, usuario.vendedorId)
      : undefined;

  const listaOrcamentos = await db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      status: orcamentos.status,
      criadoEm: orcamentos.criadoEm,
      faseNome: fases.nome,
      // Tabela e colunas escritas à mão de propósito: sem um join, o Drizzle
      // não qualifica os nomes e o "id" resolveria para a tabela errada.
      total: sql<number | null>`(
        select sum(oi.valor_min)
        from orcamento_itens oi
        where oi.orcamento_id = orcamentos.id
      )`,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .where(and(eq(atendimentos.clienteId, clienteId), escopoOrcamento))
    .orderBy(desc(orcamentos.criadoEm));

  const enderecoCompleto = [
    [cliente.endereco, cliente.numero].filter(Boolean).join(", "),
    cliente.complemento,
    cliente.bairro,
    cliente.cidade,
    cliente.cep,
  ]
    .filter(Boolean)
    .join(" – ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/cadastros/clientes"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Clientes
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {cliente.nome}
            {!cliente.ativo && <Badge variant="outline">Inativo</Badge>}
          </h1>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Telefone: </span>
            {cliente.telefone}
          </div>
          {cliente.email && (
            <div>
              <span className="text-muted-foreground">E-mail: </span>
              {cliente.email}
            </div>
          )}
          {enderecoCompleto && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Endereço: </span>
              {enderecoCompleto}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Origem: </span>
            {cliente.origem === "auto_cadastro" ? "Auto-cadastro" : "Interno"}
          </div>
          <div>
            <span className="text-muted-foreground">Cliente desde: </span>
            {format(cliente.criadoEm, "dd/MM/yyyy")}
          </div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Atendimentos</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fase</TableHead>
                <TableHead className="hidden sm:table-cell">Vendedor</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listaAtendimentos.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-16 text-center text-muted-foreground"
                  >
                    Nenhum atendimento.
                  </TableCell>
                </TableRow>
              )}
              {listaAtendimentos.map((at) => (
                <LinhaClicavel key={at.id} href={`/atendimentos/${at.id}`}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: at.faseCor }}
                      />
                      {at.faseNome}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {at.vendedorNome ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(at.criadoEm, "dd/MM/yyyy")}
                  </TableCell>
                </LinhaClicavel>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Orçamentos</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Fase do atendimento
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Total (a partir de)
                </TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listaOrcamentos.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-16 text-center text-muted-foreground"
                  >
                    Nenhum orçamento.
                  </TableCell>
                </TableRow>
              )}
              {listaOrcamentos.map((orc) => {
                const badge = STATUS_BADGE[orc.status];
                return (
                  <LinhaClicavel key={orc.id} href={`/orcamentos/${orc.id}`}>
                    <TableCell className="font-medium text-primary">
                      {orc.numero}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {orc.faseNome}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {orc.total != null ? formatarCentavos(orc.total) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(orc.criadoEm, "dd/MM/yyyy")}
                    </TableCell>
                  </LinhaClicavel>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
