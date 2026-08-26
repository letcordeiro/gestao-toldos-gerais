import Link from "next/link";
import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import { clientes, contratoOpcoes, contratos, orcamentos } from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { formatarCentavos } from "@/lib/format";
import { STATUS_LABEL, type StatusContrato } from "@/lib/contratos";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BuscaContratos } from "./busca";
import { LinhaClicavel } from "../orcamentos/linha-clicavel";

export const metadata = { title: "Contratos" };

const STATUS_VARIANT: Record<
  StatusContrato,
  "secondary" | "default" | "destructive" | "outline"
> = {
  rascunho: "outline",
  emitido: "secondary",
  assinado: "default",
  aditivado: "default",
  cancelado: "destructive",
};

const FILTROS: { chave: string; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "rascunho", rotulo: "Rascunhos" },
  { chave: "emitido", rotulo: "Emitidos" },
  { chave: "assinado", rotulo: "Assinados" },
  { chave: "aditivado", rotulo: "Aditivados" },
  { chave: "cancelado", rotulo: "Cancelados" },
];

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const usuario = await exigirUsuario();
  // Gestor e atendente veem os contratos de todo mundo.
  const veTudo = veFunilInteiro(usuario.papel);

  const filtros = [];
  // Vendedor vê só contratos dos orçamentos dele.
  if (!veTudo && usuario.vendedorId != null) {
    filtros.push(eq(orcamentos.vendedorId, usuario.vendedorId));
  }
  if (status && status !== "todos") {
    filtros.push(eq(contratos.status, status as StatusContrato));
  }
  if (q) {
    filtros.push(
      or(like(clientes.nome, `%${q}%`), like(contratos.numero, `%${q}%`))
    );
  }

  const linhas = await db
    .select({
      id: contratos.id,
      numero: contratos.numero,
      versao: contratos.versao,
      status: contratos.status,
      valorTotal: contratos.valorTotal,
      criadoEm: contratos.criadoEm,
      dataEmissao: contratos.dataEmissao,
      clienteNome: clientes.nome,
      orcamentoNumero: orcamentos.numero,
    })
    .from(contratos)
    .innerJoin(clientes, eq(contratos.clienteId, clientes.id))
    .innerJoin(orcamentos, eq(contratos.orcamentoId, orcamentos.id))
    .where(filtros.length ? and(...filtros) : undefined)
    .orderBy(desc(contratos.criadoEm));

  // Contrato com opções não tem valor fechado: a lista mostra a faixa.
  // Busca todas de uma vez e agrupa aqui — sem subquery correlacionada.
  const todasOpcoes = linhas.length
    ? await db
        .select()
        .from(contratoOpcoes)
        .where(
          inArray(
            contratoOpcoes.contratoId,
            linhas.map((l) => l.id)
          )
        )
        .orderBy(asc(contratoOpcoes.ordem))
    : [];
  const opcoesPorContrato = new Map<number, number[]>();
  for (const o of todasOpcoes) {
    const atual = opcoesPorContrato.get(o.contratoId) ?? [];
    atual.push(o.valor);
    opcoesPorContrato.set(o.contratoId, atual);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Gerados a partir de um orçamento aprovado.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <BuscaContratos q={q} status={status} />
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {FILTROS.map((f) => {
            const ativo = (status ?? "todos") === f.chave;
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (f.chave !== "todos") params.set("status", f.chave);
            const query = params.toString();
            return (
              <Link
                key={f.chave}
                href={query ? `/contratos?${query}` : "/contratos"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  ativo
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                {f.rotulo}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Valor</TableHead>
              <TableHead className="hidden lg:table-cell">Orçamento</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum contrato ainda. Abra um orçamento aprovado e use
                  “Gerar contrato”.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((linha) => (
              <LinhaClicavel key={linha.id} href={`/contratos/${linha.id}`}>
                <TableCell className="font-medium text-primary">
                  {linha.numero ?? "—"}
                  {linha.versao > 1 && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      v{linha.versao}
                    </span>
                  )}
                </TableCell>
                <TableCell>{linha.clienteNome}</TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_VARIANT[linha.status as StatusContrato]}
                  >
                    {STATUS_LABEL[linha.status as StatusContrato]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {(() => {
                    const vs = opcoesPorContrato.get(linha.id);
                    if (!vs || vs.length === 0) {
                      return formatarCentavos(linha.valorTotal);
                    }
                    const min = Math.min(...vs);
                    const max = Math.max(...vs);
                    return min === max
                      ? formatarCentavos(min)
                      : `${formatarCentavos(min)} – ${formatarCentavos(max)}`;
                  })()}
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {linha.orcamentoNumero}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {format(linha.dataEmissao ?? linha.criadoEm, "dd/MM/yyyy")}
                </TableCell>
              </LinhaClicavel>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
