import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import {
  buscarInstalacoes,
  contarPorGaveta,
  semFicha,
  type Instalacao,
} from "@/lib/instalacoes";
import { GAVETA_LABEL, ORDEM_GAVETAS, textoPrazo, type Gaveta } from "@/lib/tarefas";
import { linkWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Instalações" };

// Rótulo curto para os contadores do topo (a tela já diz que são instalações).
const CURTO: Record<Gaveta, string> = {
  atrasada: "Atrasadas",
  hoje: "Hoje",
  amanha: "Amanhã",
  proximas: "Próximas",
  sem_data: "Sem data",
};

export default async function InstalacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ prazo?: string }>;
}) {
  const { prazo } = await searchParams;
  const usuario = await exigirUsuario();
  const veTudo = veFunilInteiro(usuario.papel);
  const escopo = veTudo ? null : usuario.vendedorId ?? null;

  const todas = await buscarInstalacoes(escopo);
  const contagem = contarPorGaveta(todas);
  const pendentesDeFicha = semFicha(todas);

  const filtro = ORDEM_GAVETAS.includes(prazo as Gaveta)
    ? (prazo as Gaveta)
    : null;
  const lista = filtro ? todas.filter((i) => i.gaveta === filtro) : todas;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instalações</h1>
          <p className="text-sm text-muted-foreground">
            Negócios fechados que ainda não tiveram a entrega registrada. O
            prazo é a previsão de entrega da ficha de instalação.
          </p>
        </div>
        {veTudo && (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/instalacoes/comissoes" />}
          >
            Comissões
          </Button>
        )}
      </div>

      {/* Contadores por prazo: é a pergunta "o que vence quando", que o funil
          não responde. Clicar filtra a lista de baixo. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {ORDEM_GAVETAS.map((g) => {
          const n = contagem[g];
          const ativo = filtro === g;
          const alerta = g === "atrasada" && n > 0;
          return (
            <Link
              key={g}
              href={ativo ? "/instalacoes" : `/instalacoes?prazo=${g}`}
              scroll={false}
            >
              <Card
                className={
                  "h-full transition-colors " +
                  (ativo ? "border-primary bg-primary/5" : "hover:bg-secondary/40")
                }
              >
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{CURTO[g]}</p>
                  <p
                    className={
                      "mt-1 text-3xl font-semibold tabular-nums " +
                      (alerta ? "text-destructive" : "")
                    }
                  >
                    {n}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {pendentesDeFicha.length > 0 && !filtro && (
        <div className="rounded-lg border border-brand-orange/40 bg-brand-orange/5 p-3">
          <p className="text-sm font-semibold">
            {pendentesDeFicha.length === 1
              ? "1 negócio fechado sem ficha de instalação"
              : `${pendentesDeFicha.length} negócios fechados sem ficha de instalação`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sem ficha não há medida, prazo nem responsável — a obra não entrou
            na fila de ninguém.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pendentesDeFicha.map((i) => (
              <li key={i.orcamentoId}>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link href={`/orcamentos/${i.orcamentoId}/ficha`} />
                  }
                >
                  {i.clienteNome} · {i.numero}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {filtro && (
        <p className="text-sm text-muted-foreground">
          Mostrando <strong>{GAVETA_LABEL[filtro].toLowerCase()}</strong>.{" "}
          <Link href="/instalacoes" className="text-primary hover:underline">
            Ver todas
          </Link>
        </p>
      )}

      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma instalação pendente por aqui.
        </p>
      ) : (
        <div className="space-y-5">
          {(filtro ? [filtro] : ORDEM_GAVETAS).map((g) => {
            const itens = lista.filter((i) => i.gaveta === g);
            if (itens.length === 0) return null;
            return (
              <section key={g} className="space-y-1.5">
                <h2
                  className={
                    "text-xs font-semibold uppercase tracking-wide " +
                    (g === "atrasada" ? "text-destructive" : "text-muted-foreground")
                  }
                >
                  {GAVETA_LABEL[g]}{" "}
                  <span className="font-normal">({itens.length})</span>
                </h2>
                <ul className="divide-y rounded-lg border bg-card">
                  {itens.map((i) => (
                    <Linha key={i.orcamentoId} inst={i} veTudo={veTudo} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Linha({ inst, veTudo }: { inst: Instalacao; veTudo: boolean }) {
  const atrasada = inst.gaveta === "atrasada";
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="font-medium">
          <Link
            href={`/orcamentos/${inst.orcamentoId}`}
            className="text-primary hover:underline"
          >
            {inst.clienteNome}
          </Link>{" "}
          <span className="text-sm font-normal text-muted-foreground">
            · {inst.numero}
          </span>
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: inst.faseCor }}
            />
            {inst.faseNome}
          </span>
          {inst.cidade && <span>· {inst.cidade}</span>}
          {inst.responsavel && <span>· resp. {inst.responsavel}</span>}
          {inst.horario && <span>· {inst.horario}</span>}
          {veTudo && inst.vendedorNome && <span>· {inst.vendedorNome}</span>}
          {!inst.temFicha && (
            <span className="font-medium text-brand-orange-dark">
              · sem ficha
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p
            className={
              "text-sm tabular-nums " +
              (atrasada ? "font-medium text-destructive" : "")
            }
          >
            {inst.prevEntrega
              ? format(inst.prevEntrega, "dd/MM/yyyy", { locale: ptBR })
              : "sem data"}
          </p>
          <p className="text-xs text-muted-foreground">
            {textoPrazo(inst.prevEntrega)}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/orcamentos/${inst.orcamentoId}/ficha`} />}
        >
          Ficha
        </Button>
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={
            <a
              href={linkWhatsApp(inst.clienteTelefone)}
              target="_blank"
              rel="noopener"
            />
          }
        >
          WhatsApp
        </Button>
      </div>
    </li>
  );
}
