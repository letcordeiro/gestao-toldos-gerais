import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  avisos,
  fases,
  orcamentoItens,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import { pendenciasDoAviso } from "@/lib/avisos";
import { formatarCentavos } from "@/lib/format";
import { buscarTarefas } from "@/lib/tarefas-consulta";
import { gavetaDaTarefa, textoPrazo } from "@/lib/tarefas";
import {
  atendimentosParados,
  metricasDoFunil,
  perdasPorMotivo,
} from "@/lib/metricas";
import { buscarInstalacoes, contarPorGaveta } from "@/lib/instalacoes";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TutorialInicial } from "./tutorial-inicial";

export const metadata = { title: "Painel" };

export default async function PainelPage() {
  const usuario = await exigirUsuario();
  // Gestor e atendente veem os números do negócio inteiro.
  const veTudo = veFunilInteiro(usuario.papel);
  const escopoVendedorId = !veTudo ? usuario.vendedorId ?? null : null;
  const escopoAt =
    escopoVendedorId != null
      ? eq(atendimentos.vendedorId, escopoVendedorId)
      : undefined;
  const escopoOrc =
    escopoVendedorId != null
      ? eq(orcamentos.vendedorId, escopoVendedorId)
      : undefined;

  // ---- O dia: tarefas vencidas e de hoje -----------------------------------
  const minhasTarefas = await buscarTarefas({
    vendedorId: escopoVendedorId,
    apenasPendentes: true,
  });
  const doDia = minhasTarefas.filter((t) => {
    const g = gavetaDaTarefa(t.previstaEm);
    return g === "atrasada" || g === "hoje";
  });
  const atrasadas = doDia.filter(
    (t) => gavetaDaTarefa(t.previstaEm) === "atrasada"
  ).length;

  // ---- Instalações vencendo ---------------------------------------------
  const instalacoes = await buscarInstalacoes(escopoVendedorId);
  const porPrazo = contarPorGaveta(instalacoes);
  const instalacoesUrgentes = porPrazo.atrasada + porPrazo.hoje;

  // ---- Contagens do funil ---------------------------------------------------
  const todasFases = await db.select().from(fases).orderBy(asc(fases.ordem));
  const contagensFase = await db
    .select({ faseId: atendimentos.faseId, total: sql<number>`count(*)` })
    .from(atendimentos)
    .where(escopoAt)
    .groupBy(atendimentos.faseId);
  const totalPorFase = new Map(contagensFase.map((c) => [c.faseId, c.total]));
  const idsTerminais = new Set(
    todasFases.filter((f) => f.terminal).map((f) => f.id)
  );
  const totalAtendimentos = contagensFase.reduce((s, c) => s + c.total, 0);
  const emAberto = contagensFase
    .filter((c) => !idsTerminais.has(c.faseId))
    .reduce((s, c) => s + c.total, 0);

  // Orçamentos por status (contagem + valor a partir dos itens)
  const valorOrc = sql<number>`coalesce((select sum(${orcamentoItens.valorMin}) from ${orcamentoItens} where ${orcamentoItens.orcamentoId} = ${orcamentos.id}), 0)`;
  const porStatus = await db
    .select({
      status: orcamentos.status,
      n: sql<number>`count(*)`,
      valor: sql<number>`coalesce(sum(${valorOrc}), 0)`,
    })
    .from(orcamentos)
    .where(escopoOrc)
    .groupBy(orcamentos.status);
  const stat = (s: string) =>
    porStatus.find((p) => p.status === s) ?? { n: 0, valor: 0 };
  const enviados = stat("enviado");
  const aprovados = stat("aprovado");

  // A cobrar retorno: mesmos critérios do aviso configurável na tela de
  // Atendimentos (Configurações → Avisos). Usa o primeiro aviso ativo do tipo.
  const avisoCobranca = await db.query.avisos.findFirst({
    where: and(
      eq(avisos.gatilho, "orcamento_sem_resposta"),
      eq(avisos.ativo, true)
    ),
    orderBy: asc(avisos.id),
  });
  const nCobrar = avisoCobranca
    ? (await pendenciasDoAviso(avisoCobranca, escopoVendedorId)).length
    : 0;

  // ---- Métricas, perdas e esquecidos ---------------------------------------
  const metricas = await metricasDoFunil(escopoVendedorId);
  const perdas = await perdasPorMotivo(escopoVendedorId);
  const parados = await atendimentosParados(escopoVendedorId);
  const nuncaTrabalhados = parados.filter((p) => p.nuncaTrabalhado);

  // Desempenho por vendedor (só quem vê o funil inteiro)
  const porVendedor = veTudo
    ? await db
        .select({
          nome: vendedores.nome,
          enviados: sql<number>`sum(case when ${orcamentos.status} = 'enviado' then 1 else 0 end)`,
          aprovados: sql<number>`sum(case when ${orcamentos.status} = 'aprovado' then 1 else 0 end)`,
          valorAprovado: sql<number>`coalesce(sum(case when ${orcamentos.status} = 'aprovado' then ${valorOrc} else 0 end), 0)`,
        })
        .from(orcamentos)
        .innerJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
        .groupBy(vendedores.id)
        .orderBy(vendedores.nome)
    : [];

  const kpis = [
    {
      label: "Atendimentos em aberto",
      valor: String(emAberto),
      href: "/atendimentos",
    },
    {
      label: "Orçamentos aguardando",
      valor: String(enviados.n),
      sub: "enviados sem desfecho",
      href: "/orcamentos",
    },
    {
      label: "Aprovados",
      valor: String(aprovados.n),
      sub: formatarCentavos(aprovados.valor),
      href: "/orcamentos",
    },
    {
      label: "A cobrar retorno",
      valor: String(nCobrar),
      sub: avisoCobranca
        ? `${avisoCobranca.dias}+ dias sem resposta`
        : "aviso desativado",
      href: "/atendimentos",
      alerta: nCobrar > 0,
    },
  ];

  const maxFase = Math.max(
    1,
    ...todasFases.map((f) => totalPorFase.get(f.id) ?? 0)
  );
  const totalPerdas = perdas.reduce((s, p) => s + p.n, 0);

  return (
    <div className="space-y-5">
      <TutorialInicial
        email={usuario.email}
        nome={usuario.nome}
        ehGestor={veTudo}
        temPerfil={usuario.vendedorId != null}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">
          {usuario.nome ? `Olá, ${usuario.nome.split(" ")[0]}. ` : ""}
          {veTudo ? "Visão geral da equipe." : "Seus números."}
        </p>
      </div>

      {/* O dia vem antes dos números: o painel abre dizendo o que fazer, não
          só como o negócio está. */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">
            Para hoje
            {atrasadas > 0 && (
              <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/tarefas" />}
          >
            Ver todas
          </Button>
        </CardHeader>
        <CardContent>
          {doDia.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nada vencendo hoje.{" "}
              {minhasTarefas.length > 0
                ? `${minhasTarefas.length} tarefa(s) para os próximos dias.`
                : "Nenhuma tarefa em aberto."}
            </p>
          ) : (
            <ul className="divide-y">
              {doDia.slice(0, 6).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {t.titulo}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.clienteNome ?? "sem cliente"} ·{" "}
                      <span
                        className={
                          gavetaDaTarefa(t.previstaEm) === "atrasada"
                            ? "font-medium text-destructive"
                            : ""
                        }
                      >
                        {textoPrazo(t.previstaEm)}
                      </span>
                    </span>
                  </span>
                  {t.atendimentoId && (
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <Link href={`/atendimentos/${t.atendimentoId}`} />
                      }
                    >
                      Abrir
                    </Button>
                  )}
                </li>
              ))}
              {doDia.length > 6 && (
                <li className="pt-2 text-xs text-muted-foreground">
                  e mais {doDia.length - 6}…
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {instalacoesUrgentes > 0 && (
        <Link
          href={`/instalacoes?prazo=${porPrazo.atrasada > 0 ? "atrasada" : "hoje"}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
        >
          <span className="text-sm">
            <strong className="text-destructive">
              {porPrazo.atrasada > 0
                ? `${porPrazo.atrasada} instalação(ões) com a data já vencida`
                : `${porPrazo.hoje} instalação(ões) marcadas para hoje`}
            </strong>
            <span className="block text-muted-foreground">
              {porPrazo.atrasada > 0 && porPrazo.hoje > 0
                ? `e mais ${porPrazo.hoje} para hoje.`
                : "Confira a ficha e avise o cliente."}
            </span>
          </span>
          <span className="shrink-0 text-sm font-medium text-primary">
            Ver instalações →
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className="h-full transition-colors hover:bg-secondary/40">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p
                  className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${
                    k.alerta ? "text-brand-orange-dark" : ""
                  }`}
                >
                  {k.valor}
                </p>
                {k.sub && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {k.sub}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Como o funil se comporta — não quantos estão nele, mas o que ele
          entrega: quanto fecha, por quanto, em quanto tempo. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Conversão</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {metricas.conversao == null ? "—" : `${metricas.conversao}%`}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {metricas.ganhos} fechado(s) · {metricas.perdidos} perdido(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ticket médio</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {metricas.ticketMedio == null
                ? "—"
                : formatarCentavos(metricas.ticketMedio)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              por orçamento aprovado
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ciclo de venda</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {metricas.cicloMedioDias == null
                ? "—"
                : `${metricas.cicloMedioDias} dias`}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              do primeiro contato ao fechamento
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil de atendimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {totalAtendimentos === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum atendimento ainda.
              </p>
            ) : (
              todasFases.map((f) => {
                const n = totalPorFase.get(f.id) ?? 0;
                if (n === 0) return null;
                return (
                  <Link
                    key={f.id}
                    href={`/atendimentos?fase=${f.id}`}
                    className="flex items-center gap-3 text-sm hover:opacity-80"
                  >
                    <span className="flex w-40 shrink-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: f.cor }}
                      />
                      <span className="truncate">{f.nome}</span>
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(n / maxFase) * 100}%`,
                          backgroundColor: f.cor,
                        }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right font-medium tabular-nums">
                      {n}
                    </span>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Quem está esquecido. Sem isso, o negócio parado só some da vista. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Precisam de atenção
              {parados.length > 0 && (
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {parados.length}
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sem tarefa marcada e parados há 30 dias ou mais
              {nuncaTrabalhados.length > 0
                ? ` · ${nuncaTrabalhados.length} nunca trabalhado(s)`
                : ""}
              .
            </p>
          </CardHeader>
          <CardContent>
            {parados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum atendimento esquecido. 👌
              </p>
            ) : (
              <ul className="divide-y">
                {parados.slice(0, 8).map((a) => (
                  <li key={a.id} className="py-2 text-sm">
                    <Link
                      href={`/atendimentos/${a.id}`}
                      className="flex items-center justify-between gap-3 hover:opacity-80"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {a.clienteNome}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: a.faseCor }}
                          />
                          {a.faseNome}
                          {a.vendedorNome ? ` · ${a.vendedorNome}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {a.nuncaTrabalhado
                          ? "nunca trabalhado"
                          : `parado há ${a.diasParado} dias`}
                      </span>
                    </Link>
                  </li>
                ))}
                {parados.length > 8 && (
                  <li className="pt-2 text-xs text-muted-foreground">
                    e mais {parados.length - 8}…
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        {totalPerdas > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por que perdemos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {perdas.map((p) => (
                <div key={p.motivo} className="flex items-center gap-3 text-sm">
                  <span className="w-44 shrink-0 truncate">{p.motivo}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full rounded-full bg-destructive/70"
                      style={{ width: `${(p.n / totalPerdas) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right font-medium tabular-nums">
                    {p.n}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {veTudo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              {porVendedor.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum orçamento por vendedor ainda.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {porVendedor.map((v) => (
                    <li
                      key={v.nome}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate font-medium">{v.nome}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {v.aprovados} aprov. · {v.enviados} env. ·{" "}
                        <span className="text-foreground">
                          {formatarCentavos(v.valorAprovado)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
