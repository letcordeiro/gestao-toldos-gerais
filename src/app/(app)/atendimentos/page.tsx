import Link from "next/link";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { db } from "@/db";
import { atendimentos, clientes, fases, historicoFases } from "@/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FaseSelect } from "@/components/shared/fase-select";
import { FiltrosFunil } from "./filtros";
import { GerarLinkDialog } from "./gerar-link-dialog";
import { NovoAtendimentoDialog } from "./novo-atendimento-dialog";

function tempoNaFase(desde: Date): string {
  const dias = differenceInCalendarDays(new Date(), desde);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  return `há ${dias} dias`;
}

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string; q?: string }>;
}) {
  const { fase, q } = await searchParams;

  const todasFases = await db.select().from(fases).orderBy(asc(fases.ordem));
  const todosClientes = await db
    .select({ id: clientes.id, nome: clientes.nome, telefone: clientes.telefone })
    .from(clientes)
    .orderBy(asc(clientes.nome));

  const filtros = [];
  if (fase) filtros.push(eq(atendimentos.faseId, Number(fase)));
  if (q) {
    filtros.push(
      or(like(clientes.nome, `%${q}%`), like(clientes.telefone, `%${q}%`))
    );
  }

  const linhas = await db
    .select({
      id: atendimentos.id,
      observacoes: atendimentos.observacoes,
      criadoEm: atendimentos.criadoEm,
      faseId: atendimentos.faseId,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
    })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(filtros.length ? and(...filtros) : undefined)
    .orderBy(desc(atendimentos.atualizadoEm));

  // Data de entrada na fase atual: última mudança registrada no histórico
  const entradas = await db
    .select({
      atendimentoId: historicoFases.atendimentoId,
      desde: sql<number>`max(${historicoFases.data})`,
    })
    .from(historicoFases)
    .groupBy(historicoFases.atendimentoId);
  const desdePorAtendimento = new Map(
    entradas.map((e) => [e.atendimentoId, new Date(e.desde * 1000)])
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Atendimentos</h1>
        <div className="flex gap-2">
          <GerarLinkDialog />
          <NovoAtendimentoDialog clientes={todosClientes} />
        </div>
      </div>
      <FiltrosFunil fases={todasFases} q={q} fase={fase} />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Na fase</TableHead>
              <TableHead className="hidden md:table-cell">Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum atendimento encontrado.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((linha) => (
              <TableRow key={linha.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/atendimentos/${linha.id}`}
                    className="hover:underline"
                  >
                    {linha.clienteNome}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {linha.clienteTelefone}
                </TableCell>
                <TableCell>
                  <FaseSelect
                    atendimentoId={linha.id}
                    faseId={linha.faseId}
                    fases={todasFases}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tempoNaFase(
                    desdePorAtendimento.get(linha.id) ?? linha.criadoEm
                  )}
                </TableCell>
                <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                  {linha.observacoes}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
