import Link from "next/link";
import { and, asc, desc, eq, like, notInArray, or, sql } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  avisos,
  canais,
  clientes,
  fases,
  historicoFases,
  vendedores,
} from "@/db/schema";
import { exigirUsuario, podeComercial, veFunilInteiro } from "@/lib/auth";
import { GATILHO_LABEL, pendenciasDoAviso } from "@/lib/avisos";
import type { Aviso, PendenciaAviso } from "@/lib/avisos";
import { LinhaPendencia } from "./linha-pendencia";
import { ColunaOrdenavel } from "@/components/shared/coluna-ordenavel";
import { ordenarLista } from "@/lib/ordenacao";
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
import { Button } from "@/components/ui/button";
import { ChamadoDialog } from "../chamados/chamado-dialog";
import { atendimentosParaChamado } from "../chamados/actions";
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
  searchParams: Promise<{
    fase?: string;
    q?: string;
    ordem?: string;
    dir?: string;
  }>;
}) {
  const { fase, q, ordem, dir } = await searchParams;
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

  // Quem enxerga o funil inteiro: gestor e atendente.
  const veTudo = veFunilInteiro(usuario.papel);
  // Atendente não recebe lead: fica de fora da lista de responsáveis.
  const vendedoresAtribuiveis = vendedoresAtivos.filter(
    (v) => v.papel !== "atendente"
  );
  // Link de cadastro: quem vê o funil inteiro vê o de todos; vendedor só o seu.
  const linksCadastro = vendedoresAtribuiveis
    .filter((v) => v.linkToken && (veTudo || v.id === usuario.vendedorId))
    .map((v) => ({ id: v.id, nome: v.nome, token: v.linkToken as string }));

  // Abrir chamado sem sair da lista. Consulta propria porque o pos-venda vale
  // para cliente de funil JA FECHADO, que os filtros desta tela escondem.
  const opcoesChamado = await atendimentosParaChamado();

  const listaCanais = await db
    .select({ id: canais.id, nome: canais.nome })
    .from(canais)
    .where(eq(canais.ativo, true))
    .orderBy(asc(canais.ordem), asc(canais.id));

  // Fases escondidas da visão padrão (flag "exibir na listagem" na tela de
  // Fases). Era uma regra fixa para "Perdido"; agora vale para qualquer fase.
  const fasesOcultas = todasFases.filter((f) => !f.exibirNaListagem);

  const filtros = [];
  // Cliente inativo sai do funil — o histórico dele fica em
  // /cadastros/clientes/[id].
  filtros.push(eq(clientes.ativo, true));
  if (escopoVendedor) filtros.push(escopoVendedor);
  if (fase) filtros.push(eq(atendimentos.faseId, Number(fase)));
  else if (fasesOcultas.length)
    filtros.push(
      notInArray(
        atendimentos.faseId,
        fasesOcultas.map((f) => f.id)
      )
    );
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

  // Ordenação por coluna. Feita aqui e não no SQL porque duas das colunas são
  // calculadas: "No status" sai do histórico de fases e "Status" ordena pela
  // ordem do funil, não pelo nome da fase.
  const ordemDaFase = new Map(todasFases.map((f) => [f.id, f.ordem]));
  const diasNaFase = (l: (typeof linhas)[number]) =>
    differenceInCalendarDays(
      new Date(),
      desdePorAtendimento.get(l.id) ?? l.criadoEm
    );
  const linhasOrdenadas = ordenarLista(linhas, ordem, dir, {
    cliente: (l) => l.clienteNome,
    telefone: (l) => l.clienteTelefone,
    // Status ordena pela ordem do funil, não pelo nome da fase.
    status: (l) => ordemDaFase.get(l.faseId) ?? 0,
    tempo: (l) => diasNaFase(l),
  });

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
  // "Todos" conta o que a visão padrão mostra — sem as fases ocultas.
  const idsOcultas = new Set(fasesOcultas.map((f) => f.id));
  const totalGeral = contagens
    .filter((c) => !idsOcultas.has(c.faseId))
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
    // Cobrança não é fase do funil: cor própria (vermelho e laranja da marca).
    parcela_vencida: "#EF4444",
    contrato_sem_assinatura: "#FF8500",
  };
  const ICONE: Record<Aviso["gatilho"], string> = {
    orcamento_sem_resposta: "🔔",
    atendimento_concluido: "⭐",
    parcela_vencida: "💰",
    contrato_sem_assinatura: "✍️",
  };
  const tintaAviso = (cor?: string) =>
    cor
      ? { backgroundColor: `${cor}1f`, borderColor: `${cor}66` }
      : undefined;


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
      base="/atendimentos"
      chave={chave}
      ordem={ordem}
      dir={dir}
      extras={{ q, fase }}
      className={className}
    >
      {children}
    </ColunaOrdenavel>
  );

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
                    <LinhaPendencia
                      key={p.alvoId}
                      avisoId={aviso.id}
                      alvoId={p.alvoId}
                      temRearme={aviso.rearmeDias != null}
                    >
                      <Link
                        href={`/atendimentos/${p.atendimentoId}`}
                        className="font-medium hover:underline"
                      >
                        {p.clienteNome}
                      </Link>
                      <span className="text-muted-foreground">
                        {p.orcamentoNumero
                          ? `· ${p.orcamentoNumero} `
                          : ""}
                        {p.valorTexto ? `· ${p.valorTexto} ` : ""}
                        · há {dias} dias
                        {veTudo && p.vendedorNome ? ` · ${p.vendedorNome}` : ""}
                      </span>
                      <a
                        href={p.linkWhatsApp}
                        target="_blank"
                        rel="noopener"
                        className="font-medium text-primary hover:underline"
                      >
                        WhatsApp ↗
                      </a>
                    </LinhaPendencia>
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
          {/* Avisos e Fases saíram daqui: agora moram na engrenagem de
              Configurações, junto com o resto do que se configura uma vez. */}
          <GerarLinkDialog links={linksCadastro} />
          <ChamadoDialog
            atendimentos={opcoesChamado}
            responsaveis={
              veTudo
                ? vendedoresAtribuiveis.map((v) => ({ id: v.id, nome: v.nome }))
                : []
            }
            irParaChamado
            trigger={<Button variant="outline">Abrir chamado</Button>}
          />
          <NovoAtendimentoDialog
            clientes={todosClientes}
            canais={listaCanais}
            vendedores={vendedoresAtribuiveis.map((v) => ({
              id: v.id,
              nome: v.nome,
            }))}
            ehGestor={veTudo}
            paraOrcamento={podeComercial(usuario.papel)}
          />
        </div>
      </div>
      <FiltrosFunil
        fases={todasFases.map((f) => ({
          id: f.id,
          nome: f.nome,
          cor: f.cor,
          total: totalPorFase.get(f.id) ?? 0,
        }))}
        totalGeral={totalGeral}
        q={q}
        fase={fase}
        ordem={ordem}
        dir={dir}
      />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <Coluna chave="cliente">Cliente</Coluna>
              <Coluna chave="telefone" className="hidden sm:table-cell">
                Telefone
              </Coluna>
              <Coluna chave="status">Status do atendimento</Coluna>
              <Coluna chave="tempo" className="hidden sm:table-cell">
                No status
              </Coluna>
              <TableHead className="hidden md:table-cell">Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhasOrdenadas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum atendimento encontrado.
                </TableCell>
              </TableRow>
            )}
            {linhasOrdenadas.map((linha) => (
              <TableRow key={linha.id}>
                <TableCell className="font-medium">
                  {/* Verde, como na lista de Clientes: é por aqui que se chega
                      na tela do atendimento (e nos botões de abrir chamado,
                      agendar visita, novo orçamento). Pintado como texto comum,
                      ninguém descobre que dá para clicar. */}
                  <Link
                    href={`/atendimentos/${linha.id}`}
                    className="text-primary hover:underline"
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
