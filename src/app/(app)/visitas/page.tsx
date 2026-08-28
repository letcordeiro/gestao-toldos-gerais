import Link from "next/link";
import { asc, eq, gte, and, type SQL } from "drizzle-orm";
import { format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import { atendimentos, clientes, vendedores, visitas } from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import {
  SITUACAO_VISITA_COR,
  SITUACAO_VISITA_LABEL,
  agruparPorDia,
  conflitos,
  fimDaVisita,
  linkDaRota,
  linkDoEndereco,
  paradasForaDaRota,
  type SituacaoVisita,
} from "@/lib/visitas";
import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { SituacaoVisitaSelect, ExcluirVisitaButton } from "./acoes-visita";

export const metadata = { title: "Visitas" };

export default async function VisitasPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  const usuario = await exigirUsuario();
  const veTudo = veFunilInteiro(usuario.papel);
  const passadas = ver === "passadas";

  const filtros: (SQL | undefined)[] = [];
  // A agenda olha para frente: o que já passou fica atrás de um botão.
  if (!passadas) filtros.push(gte(visitas.inicioEm, startOfDay(new Date())));
  if (!veTudo && usuario.vendedorId != null) {
    filtros.push(eq(visitas.vendedorId, usuario.vendedorId));
  }

  const linhas = await db
    .select({
      id: visitas.id,
      inicioEm: visitas.inicioEm,
      duracaoMin: visitas.duracaoMin,
      endereco: visitas.endereco,
      observacoes: visitas.observacoes,
      situacao: visitas.situacao,
      atendimentoId: visitas.atendimentoId,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      vendedorNome: vendedores.nome,
    })
    .from(visitas)
    .innerJoin(atendimentos, eq(visitas.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(vendedores, eq(visitas.vendedorId, vendedores.id))
    .where(filtros.length ? and(...filtros) : undefined)
    .orderBy(asc(visitas.inicioEm));

  // O tipo da coluna vem como string do Drizzle; fixar aqui evita `any` ao
  // indexar os mapas de rótulo e cor lá embaixo.
  const paraAgenda = linhas.map((l) => ({
    ...l,
    situacao: l.situacao as SituacaoVisita,
  }));
  const dias = agruparPorDia<(typeof paraAgenda)[number]>(paraAgenda);
  const hoje = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visitas</h1>
          <p className="text-sm text-muted-foreground">
            A agenda de campo, dia a dia e em ordem de horário. Para agendar,
            abra o atendimento do cliente.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={passadas ? "/visitas" : "/visitas?ver=passadas"} />}
        >
          {passadas ? "Ver próximas" : "Ver anteriores"}
        </Button>
      </div>

      {dias.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {passadas
            ? "Nenhuma visita anterior."
            : "Nenhuma visita marcada. Abra um atendimento e use “Agendar visita”."}
        </p>
      ) : (
        <div className="space-y-6">
          {dias.map((dia) => {
            // A rota sai do endereço da empresa e segue a ordem dos horários.
            const rota = linkDaRota(dia.visitas, EMPRESA.endereco);
            const foraDaRota = paradasForaDaRota(dia.visitas);
            const emConflito = new Set(conflitos(dia.visitas));
            const ehHoje = isSameDay(dia.data, hoje);

            return (
              <section key={dia.chave} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">
                    {ehHoje && (
                      <span className="mr-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        Hoje
                      </span>
                    )}
                    {format(dia.data, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {dia.visitas.length} visita
                      {dia.visitas.length > 1 ? "s" : ""}
                    </span>
                  </h2>
                  {rota && (
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<a href={rota} target="_blank" rel="noopener" />}
                    >
                      Abrir rota do dia
                    </Button>
                  )}
                </div>

                {foraDaRota > 0 && (
                  <p className="text-xs text-muted-foreground">
                    A rota leva as 10 primeiras paradas — {foraDaRota} ficaram
                    de fora (limite do Google Maps).
                  </p>
                )}

                <ul className="divide-y rounded-lg border bg-card">
                  {dia.visitas.map((v) => {
                    const mapa = linkDoEndereco(v.endereco);
                    return (
                      <li key={v.id} className="flex flex-wrap gap-3 p-3">
                        <div className="w-16 shrink-0">
                          <p className="font-semibold tabular-nums">
                            {format(v.inicioEm, "HH:mm")}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {format(fimDaVisita(v), "HH:mm")}
                          </p>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            <Link
                              href={`/atendimentos/${v.atendimentoId}`}
                              className="hover:underline"
                            >
                              {v.clienteNome}
                            </Link>
                            {emConflito.has(v.id) && (
                              <span className="ml-2 text-xs font-medium text-destructive">
                                choca com a visita anterior
                              </span>
                            )}
                          </p>
                          {v.endereco && (
                            <p className="text-xs text-muted-foreground">
                              {mapa ? (
                                <a
                                  href={mapa}
                                  target="_blank"
                                  rel="noopener"
                                  className="hover:underline"
                                >
                                  {v.endereco}
                                </a>
                              ) : (
                                v.endereco
                              )}
                            </p>
                          )}
                          {v.observacoes && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {v.observacoes}
                            </p>
                          )}
                          {veTudo && v.vendedorNome && (
                            <p className="text-xs text-muted-foreground">
                              {v.vendedorNome}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-start gap-1.5">
                          <span
                            className="mt-2 size-2 rounded-full"
                            style={{
                              backgroundColor:
                                SITUACAO_VISITA_COR[v.situacao],
                            }}
                            title={SITUACAO_VISITA_LABEL[v.situacao]}
                          />
                          <SituacaoVisitaSelect
                            visitaId={v.id}
                            situacao={v.situacao}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            nativeButton={false}
                            render={
                              <a
                                href={linkWhatsApp(v.clienteTelefone)}
                                target="_blank"
                                rel="noopener"
                              />
                            }
                          >
                            WhatsApp
                          </Button>
                          <ExcluirVisitaButton visitaId={v.id} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
