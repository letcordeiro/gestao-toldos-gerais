import Link from "next/link";
import { and, asc, desc, eq, like, lte, or, sql } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  historicoFases,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { linkWhatsApp } from "@/lib/whatsapp";
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

const DIAS_COBRANCA = 15;

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
  const usuario = await exigirUsuario();
  // Vendedor vê só os próprios atendimentos; gestor vê todos.
  const escopoVendedor =
    usuario.papel === "vendedor" && usuario.vendedorId != null
      ? eq(atendimentos.vendedorId, usuario.vendedorId)
      : undefined;

  const todasFases = await db.select().from(fases).orderBy(asc(fases.ordem));
  const todosClientes = await db
    .select({ id: clientes.id, nome: clientes.nome, telefone: clientes.telefone })
    .from(clientes)
    .where(eq(clientes.ativo, true))
    .orderBy(asc(clientes.nome));

  // Vendedores ativos com link de cadastro.
  const vendedoresAtivos = await db
    .select({
      id: vendedores.id,
      nome: vendedores.nome,
      linkToken: vendedores.linkToken,
      papel: vendedores.papel,
    })
    .from(vendedores)
    .where(eq(vendedores.ativo, true))
    .orderBy(asc(vendedores.nome));

  const ehGestor = usuario.papel === "gestor";
  // Link de cadastro: gestor vê o de todos; vendedor só o seu.
  const linksCadastro = vendedoresAtivos
    .filter((v) => v.linkToken && (ehGestor || v.id === usuario.vendedorId))
    .map((v) => ({ id: v.id, nome: v.nome, token: v.linkToken as string }));

  const filtros = [];
  if (escopoVendedor) filtros.push(escopoVendedor);
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

  // Resumo do funil: total de atendimentos por fase (visão geral, sem filtro)
  const contagens = await db
    .select({
      faseId: atendimentos.faseId,
      total: sql<number>`count(*)`,
    })
    .from(atendimentos)
    .where(escopoVendedor)
    .groupBy(atendimentos.faseId);
  const totalPorFase = new Map(contagens.map((c) => [c.faseId, c.total]));
  const totalGeral = contagens.reduce((s, c) => s + c.total, 0);

  // Cobrança de retorno: orçamentos enviados há 15+ dias ainda sem desfecho
  // (continuam "enviado", não viraram aprovado/recusado). Escopo por vendedor.
  const corte = new Date(Date.now() - DIAS_COBRANCA * 24 * 60 * 60 * 1000);
  const escopoOrc =
    usuario.papel === "vendedor" && usuario.vendedorId != null
      ? eq(orcamentos.vendedorId, usuario.vendedorId)
      : undefined;
  const pendencias = await db
    .select({
      atendimentoId: orcamentos.atendimentoId,
      numero: orcamentos.numero,
      enviadoEm: orcamentos.enviadoEm,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      vendedorNome: vendedores.nome,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .where(
      and(
        eq(orcamentos.status, "enviado"),
        lte(orcamentos.enviadoEm, corte),
        escopoOrc
      )
    )
    .orderBy(asc(orcamentos.enviadoEm));

  return (
    <div className="space-y-4">
      {pendencias.length > 0 && (
        <div className="rounded-lg border border-brand-orange/40 bg-brand-orange/10 p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none">🔔</span>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {pendencias.length === 1
                  ? "1 cliente para cobrar retorno"
                  : `${pendencias.length} clientes para cobrar retorno`}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  — orçamento enviado há {DIAS_COBRANCA}+ dias sem resposta
                </span>
              </p>
              <ul className="space-y-1.5">
                {pendencias.map((p) => {
                  const dias = p.enviadoEm
                    ? differenceInCalendarDays(new Date(), p.enviadoEm)
                    : DIAS_COBRANCA;
                  return (
                    <li
                      key={p.atendimentoId + p.numero}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                    >
                      <Link
                        href={`/atendimentos/${p.atendimentoId}`}
                        className="font-medium hover:underline"
                      >
                        {p.clienteNome}
                      </Link>
                      <span className="text-muted-foreground">
                        · orçamento {p.numero} · há {dias} dias
                        {ehGestor && p.vendedorNome
                          ? ` · ${p.vendedorNome}`
                          : ""}
                      </span>
                      <a
                        href={linkWhatsApp(
                          p.clienteTelefone,
                          `Olá, ${p.clienteNome.split(" ")[0]}! Passando para saber se conseguiu avaliar o orçamento ${p.numero} da Toldos Gerais. Qualquer dúvida, estou à disposição.`
                        )}
                        target="_blank"
                        rel="noopener"
                        className="font-medium text-primary hover:underline"
                      >
                        WhatsApp ↗
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Atendimentos</h1>
        <div className="flex gap-2">
          <GerarLinkDialog links={linksCadastro} />
          <NovoAtendimentoDialog
            clientes={todosClientes}
            vendedores={vendedoresAtivos.map((v) => ({ id: v.id, nome: v.nome }))}
            ehGestor={ehGestor}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/atendimentos"
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            !fase
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          Todos <span className="text-muted-foreground">({totalGeral})</span>
        </Link>
        {todasFases.map((f) => {
          const n = totalPorFase.get(f.id) ?? 0;
          if (n === 0 && String(f.id) !== fase) return null;
          const ativo = String(f.id) === fase;
          return (
            <Link
              key={f.id}
              href={`/atendimentos?fase=${f.id}`}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                ativo
                  ? "border-primary bg-primary/10 font-medium"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: f.cor }}
              />
              {f.nome} <span className="text-muted-foreground">({n})</span>
            </Link>
          );
        })}
      </div>
      <FiltrosFunil fases={todasFases} q={q} fase={fase} />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Telefone</TableHead>
              <TableHead>Status do atendimento</TableHead>
              <TableHead className="hidden sm:table-cell">No status</TableHead>
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
                  <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                    {linha.clienteTelefone}
                  </span>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {linha.clienteTelefone}
                </TableCell>
                <TableCell>
                  <FaseSelect
                    atendimentoId={linha.id}
                    faseId={linha.faseId}
                    fases={todasFases}
                  />
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
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
