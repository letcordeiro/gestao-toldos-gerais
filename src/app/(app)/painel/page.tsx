import Link from "next/link";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  fases,
  orcamentoItens,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { formatarCentavos } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DIAS_COBRANCA = 15;
const FASES_TERMINAIS = ["Concluído", "Perdido"];

export default async function PainelPage() {
  const usuario = await exigirUsuario();
  const ehGestor = usuario.papel === "gestor";
  const escopoAt =
    !ehGestor && usuario.vendedorId != null
      ? eq(atendimentos.vendedorId, usuario.vendedorId)
      : undefined;
  const escopoOrc =
    !ehGestor && usuario.vendedorId != null
      ? eq(orcamentos.vendedorId, usuario.vendedorId)
      : undefined;

  // Atendimentos por fase (para o funil e o total em aberto)
  const todasFases = await db
    .select()
    .from(fases)
    .orderBy(asc(fases.ordem));
  const contagensFase = await db
    .select({ faseId: atendimentos.faseId, total: sql<number>`count(*)` })
    .from(atendimentos)
    .where(escopoAt)
    .groupBy(atendimentos.faseId);
  const totalPorFase = new Map(contagensFase.map((c) => [c.faseId, c.total]));
  const idsTerminais = new Set(
    todasFases.filter((f) => FASES_TERMINAIS.includes(f.nome)).map((f) => f.id)
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

  // A cobrar retorno: enviados há 15+ dias ainda sem desfecho
  const corte = new Date(Date.now() - DIAS_COBRANCA * 24 * 60 * 60 * 1000);
  const [{ nCobrar }] = await db
    .select({ nCobrar: sql<number>`count(*)` })
    .from(orcamentos)
    .where(
      and(eq(orcamentos.status, "enviado"), lte(orcamentos.enviadoEm, corte), escopoOrc)
    );

  // Desempenho por vendedor (só gestor)
  const porVendedor = ehGestor
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
    { label: "Atendimentos em aberto", valor: String(emAberto), href: "/atendimentos" },
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
      sub: "15+ dias sem resposta",
      href: "/atendimentos",
      alerta: nCobrar > 0,
    },
  ];

  const maxFase = Math.max(1, ...todasFases.map((f) => totalPorFase.get(f.id) ?? 0));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">
          {usuario.nome ? `Olá, ${usuario.nome.split(" ")[0]}. ` : ""}
          {ehGestor ? "Visão geral da equipe." : "Seus números."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className="h-full transition-colors hover:bg-secondary/40">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p
                  className={`mt-1 text-3xl font-semibold tracking-tight ${
                    k.alerta ? "text-brand-orange-dark" : ""
                  }`}
                >
                  {k.valor}
                </p>
                {k.sub && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{k.sub}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
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
                    <span className="w-6 shrink-0 text-right font-medium">
                      {n}
                    </span>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {ehGestor && (
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
