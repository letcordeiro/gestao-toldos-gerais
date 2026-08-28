import Link from "next/link";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  contratos,
  fases,
  orcamentoItens,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario, podeComercial, veFunilInteiro } from "@/lib/auth";
import { ordenarLista } from "@/lib/ordenacao";
import { ColunaOrdenavel } from "@/components/shared/coluna-ordenavel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarCentavos } from "@/lib/format";
import { LinhaClicavel } from "./linha-clicavel";
import { CelulaContrato } from "./celula-contrato";

export const metadata = { title: "Orçamentos" };


const STATUS_BADGE: Record<
  string,
  { label: string; variant: "secondary" | "default" | "destructive" | "outline" }
> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  agendado: { label: "Aguardando envio", variant: "outline" },
  enviando: { label: "Enviando", variant: "outline" },
  enviado: { label: "Enviado", variant: "secondary" },
  falha_envio: { label: "Falha no envio", variant: "destructive" },
  aprovado: { label: "Aprovado", variant: "default" },
  recusado: { label: "Recusado", variant: "destructive" },
};

// Filtros por situação do CONTRATO. A lista de contratos deixou de existir
// como tela própria (27/08/2026): ela repetia cliente, valor e data da lista
// de orçamentos e trazia uma coluna que só apontava de volta para cá.
const FILTROS_CONTRATO: { chave: string; label: string }[] = [
  { chave: "com", label: "Com contrato" },
  { chave: "rascunho", label: "Minuta" },
  { chave: "emitido", label: "Aguardando assinatura" },
  { chave: "assinado", label: "Assinado" },
];

// Ordem de exibição dos cards e cor de identificação de cada status.
const STATUS_CARDS: { chave: string; label: string; cor: string }[] = [
  { chave: "rascunho", label: "Rascunho", cor: "#9CA3AF" },
  { chave: "agendado", label: "Aguardando envio", cor: "#2563EB" },
  { chave: "enviado", label: "Enviados", cor: "#D97706" },
  { chave: "falha_envio", label: "Falhas", cor: "#DC2626" },
  { chave: "aprovado", label: "Aprovados", cor: "#004E36" },
  { chave: "recusado", label: "Recusados", cor: "#DC2626" },
];

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    contrato?: string;
    ordem?: string;
    dir?: string;
  }>;
}) {
  const { status: statusParam, contrato: contratoParam, ordem, dir } =
    await searchParams;
  const contratoFiltro = FILTROS_CONTRATO.some((f) => f.chave === contratoParam)
    ? contratoParam
    : undefined;
  const statusFiltro =
    statusParam && statusParam in STATUS_BADGE ? statusParam : undefined;

  const usuario = await exigirUsuario();
  // Gestor e atendente veem os orçamentos de todo mundo.
  const veTudo = veFunilInteiro(usuario.papel);
  const ehComercial = podeComercial(usuario.papel);
  // Vendedor vê só os próprios orçamentos.
  const escopo =
    !veTudo && usuario.vendedorId != null
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
      contratoId: contratos.id,
      contratoNumero: contratos.numero,
      contratoStatus: contratos.status,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    // Contrato vivo do orçamento. Cancelado fica de fora: o que interessa na
    // lista é o documento que vale hoje.
    .leftJoin(
      contratos,
      and(
        eq(contratos.orcamentoId, orcamentos.id),
        ne(contratos.status, "cancelado")
      )
    )
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
  const porStatus = statusFiltro
    ? todos.filter((o) => o.status === statusFiltro)
    : todos.filter((o) => o.status !== "recusado");
  const emJogo = contratoFiltro
    ? porStatus.filter((o) =>
        contratoFiltro === "com"
          ? o.contratoId != null
          : contratoFiltro === "assinado"
            ? o.contratoStatus === "assinado" || o.contratoStatus === "aditivado"
            : o.contratoStatus === contratoFiltro
      )
    : porStatus;
  // Status ordena pelo andamento da proposta, não pelo nome.
  const ORDEM_STATUS: Record<string, number> = {
    rascunho: 0,
    agendado: 1,
    enviando: 2,
    falha_envio: 3,
    enviado: 4,
    aprovado: 5,
    recusado: 6,
  };
  const linhas = ordenarLista(emJogo, ordem, dir, {
    numero: (o) => o.numero,
    cliente: (o) => o.clienteNome,
    vendedor: (o) => o.vendedorNome,
    status: (o) => ORDEM_STATUS[o.status] ?? 99,
    total: (o) => o.total ?? 0,
    data: (o) => o.criadoEm,
    contrato: (o) => o.contratoNumero ?? "",
  });
  const Coluna = ({
    chave,
    className,
    children,
  }: {
    chave: string;
    className?: string;
    children: React.ReactNode;
  }) => (
    <ColunaOrdenavel
      base="/orcamentos"
      chave={chave}
      ordem={ordem}
      dir={dir}
      extras={{ status: statusParam, contrato: contratoParam }}
      className={className}
    >
      {children}
    </ColunaOrdenavel>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
        {ehComercial && (
          <Button nativeButton={false} render={<Link href="/orcamentos/novo" />}>
            Novo orçamento
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
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

      {/* Filtro por contrato: é a pergunta que a tela de Contratos respondia
          ("quais estão esperando assinatura"), agora sem uma lista à parte. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Contrato:
        </span>
        {FILTROS_CONTRATO.map((f) => {
          const ativo = contratoFiltro === f.chave;
          const params = new URLSearchParams();
          if (statusParam) params.set("status", statusParam);
          if (!ativo) params.set("contrato", f.chave);
          const query = params.toString();
          return (
            <Link
              key={f.chave}
              href={query ? `/orcamentos?${query}` : "/orcamentos"}
              scroll={false}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                ativo
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {f.label}
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
              <Coluna chave="numero">Número</Coluna>
              <Coluna chave="cliente">Cliente</Coluna>
              {veTudo && (
                <Coluna chave="vendedor" className="hidden sm:table-cell">
                  Vendedor
                </Coluna>
              )}
              <Coluna chave="status">Status</Coluna>
              <Coluna chave="contrato">Contrato</Coluna>
              <Coluna chave="total" className="hidden md:table-cell">
                Total (a partir de)
              </Coluna>
              <Coluna chave="data" className="hidden md:table-cell">
                Data
              </Coluna>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={veTudo ? 7 : 6}
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
                  {veTudo && (
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {linha.vendedorNome ?? "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  {/* O contrato é outro documento e tem tela própria: o selo
                      leva direto para ela, sem passar por uma lista. */}
                  <CelulaContrato
                    contratoId={linha.contratoId}
                    numero={linha.contratoNumero}
                    status={linha.contratoStatus}
                  />
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
