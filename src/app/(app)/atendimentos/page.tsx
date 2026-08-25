import Link from "next/link";
import { and, asc, desc, eq, like, ne, or, sql } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  avisos,
  clientes,
  fases,
  historicoFases,
  vendedores,
} from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { GATILHO_LABEL, pendenciasDoAviso } from "@/lib/avisos";
import type { Aviso, PendenciaAviso } from "@/lib/avisos";
import { BotaoContatoAviso } from "./botao-contato-aviso";
import { Button } from "@/components/ui/button";
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

export const metadata = { title: "Atendimentos" };


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

  const fasePerdido = todasFases.find((f) => f.nome === "Perdido");

  const filtros = [];
  // Cliente inativo sai do funil — o histórico dele fica em
  // /cadastros/clientes/[id].
  filtros.push(eq(clientes.ativo, true));
  if (escopoVendedor) filtros.push(escopoVendedor);
  if (fase) filtros.push(eq(atendimentos.faseId, Number(fase)));
  // Perdido não aparece na visão padrão — só clicando no chip "Perdido".
  else if (fasePerdido) filtros.push(ne(atendimentos.faseId, fasePerdido.id));
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
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(and(eq(clientes.ativo, true), escopoVendedor))
    .groupBy(atendimentos.faseId);
  const totalPorFase = new Map(contagens.map((c) => [c.faseId, c.total]));
  // "Todos" conta o que a visão padrão mostra — sem os perdidos.
  const totalGeral = contagens
    .filter((c) => c.faseId !== fasePerdido?.id)
    .reduce((s, c) => s + c.total, 0);

  // Avisos configuráveis (Cadastros → Avisos): pendências de cada aviso ativo.
  const escopoAvisoVendedorId =
    usuario.papel === "vendedor" && usuario.vendedorId != null
      ? usuario.vendedorId
      : null;
  const avisosAtivos = await db
    .select()
    .from(avisos)
    .where(eq(avisos.ativo, true))
    .orderBy(asc(avisos.id));
  const banners: { aviso: Aviso; pendencias: PendenciaAviso[] }[] = [];
  for (const aviso of avisosAtivos) {
    const pendencias = await pendenciasDoAviso(aviso, escopoAvisoVendedorId);
    if (pendencias.length > 0) banners.push({ aviso, pendencias });
  }

  // Cada aviso usa a cor da fase que representa, para diferenciar de relance.
  // (hex + "1f" = ~12% de opacidade no fundo; "66" = ~40% na borda)
  const corPorGatilho: Record<Aviso["gatilho"], string | undefined> = {
    orcamento_sem_resposta: todasFases.find(
      (f) => f.nome === "Orçamento enviado"
    )?.cor,
    atendimento_concluido: todasFases.find((f) => f.nome === "Concluído")?.cor,
  };
  const ICONE: Record<Aviso["gatilho"], string> = {
    orcamento_sem_resposta: "🔔",
    atendimento_concluido: "⭐",
  };
  const tintaAviso = (cor?: string) =>
    cor
      ? { backgroundColor: `${cor}1f`, borderColor: `${cor}66` }
      : undefined;

  return (
    <div className="space-y-4">
      {banners.map(({ aviso, pendencias }) => (
        <div
          key={aviso.id}
          className="rounded-lg border p-4"
          style={tintaAviso(corPorGatilho[aviso.gatilho])}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none">{ICONE[aviso.gatilho]}</span>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {aviso.nome}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  — {pendencias.length === 1
                    ? "1 cliente"
                    : `${pendencias.length} clientes`}{" "}
                  · {GATILHO_LABEL[aviso.gatilho]} há {aviso.dias}+ dias
                </span>
              </p>
              <ul className="space-y-1.5">
                {pendencias.map((p) => {
                  const dias = differenceInCalendarDays(new Date(), p.desde);
                  return (
                    <li
                      key={p.alvoId}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                    >
                      <Link
                        href={`/atendimentos/${p.atendimentoId}`}
                        className="font-medium hover:underline"
                      >
                        {p.clienteNome}
                      </Link>
                      <span className="text-muted-foreground">
                        {p.orcamentoNumero
                          ? `· orçamento ${p.orcamentoNumero} `
                          : ""}
                        · há {dias} dias
                        {ehGestor && p.vendedorNome ? ` · ${p.vendedorNome}` : ""}
                      </span>
                      <a
                        href={p.linkWhatsApp}
                        target="_blank"
                        rel="noopener"
                        className="font-medium text-primary hover:underline"
                      >
                        WhatsApp ↗
                      </a>
                      <BotaoContatoAviso
                        avisoId={aviso.id}
                        alvoId={p.alvoId}
                        definitivo={false}
                      >
                        já contatei
                      </BotaoContatoAviso>
                      {aviso.rearmeDias != null && (
                        <BotaoContatoAviso
                          avisoId={aviso.id}
                          alvoId={p.alvoId}
                          definitivo
                        >
                          não avisar mais
                        </BotaoContatoAviso>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Atendimentos</h1>
        <div className="flex flex-wrap gap-2">
          {ehGestor && (
            <>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/cadastros/avisos" />}
              >
                Avisos
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/cadastros/fases" />}
              >
                Fases
              </Button>
            </>
          )}
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
