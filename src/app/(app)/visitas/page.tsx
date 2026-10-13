import { CartaoClicavel } from "@/components/shared/item-clicavel";
import Link from "next/link";
import { asc, eq, gte, lt, and, type SQL } from "drizzle-orm";
import { format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import { agendaBloqueios, atendimentos, clientes, vendedores, visitas } from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import {
  SITUACAO_VISITA_COR,
  SITUACAO_VISITA_LABEL,
  agruparPorDia,
  chaveDoDia,
  conflitos,
  fimDaVisita,
  linkDaRota,
  linkDoEndereco,
  paradasForaDaRota,
  paraInputLocal,
  type SituacaoVisita,
} from "@/lib/visitas";
import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SituacaoVisitaSelect, ExcluirVisitaButton } from "./acoes-visita";
import { VisitaDialog } from "./visita-dialog";
import { atendimentosParaVisita, responsaveisDeVisita } from "./actions";
import {
  bloqueioEncerrado,
  descreverBloqueio,
  diasDaSemana,
  ehDiaISO,
  hojeISO,
  segundaDaSemana,
  somarDias,
  valeNoDia,
  type Bloqueio,
} from "@/lib/agenda";
import { AgendaSemana, type ItemDaSemana } from "./agenda-semana";
import { BloqueioDialog } from "./bloqueio-dialog";
import { excluirBloqueio } from "./bloqueios-actions";
import { ExcluirConfirmado } from "../cadastros/excluir-confirmado";
import { GuiaDaTela } from "@/components/shared/guia-da-tela";
import { guiaDeVisitas } from "@/lib/guia-visitas";

export const metadata = { title: "Visitas" };

const primeiraMaiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default async function VisitasPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; semana?: string; de?: string }>;
}) {
  const { ver, semana, de } = await searchParams;
  const usuario = await exigirUsuario();
  const veTudo = veFunilInteiro(usuario.papel);
  const passadas = ver === "passadas";
  // A agenda abre na SEMANA (13/10/2026); a lista de antes continua em
  // "Lista" e em "Ver anteriores".
  const modoSemana = ver !== "lista" && !passadas;
  const hoje = hojeISO();
  const segunda = segundaDaSemana(ehDiaISO(semana) ? semana : hoje);
  const dias = diasDaSemana(segunda);
  // Gestor/atendente podem olhar a agenda de um vendedor só (?de=id).
  const filtroVendedor =
    veTudo && Number(de) > 0 ? Number(de) : !veTudo ? usuario.vendedorId : null;

  const filtros: (SQL | undefined)[] = [];
  // A agenda olha para frente: o que já passou fica atrás de um botão.
  if (modoSemana) {
    const [a, m, d] = segunda.split("-").map(Number);
    filtros.push(gte(visitas.inicioEm, new Date(a, m - 1, d)));
    filtros.push(lt(visitas.inicioEm, new Date(a, m - 1, d + 7)));
  } else if (!passadas) {
    filtros.push(gte(visitas.inicioEm, startOfDay(new Date())));
  }
  if (filtroVendedor != null) {
    filtros.push(eq(visitas.vendedorId, filtroVendedor));
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
      vendedorId: visitas.vendedorId,
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
  // Para agendar sem sair da tela: quem pode receber visita e quem pode ir.
  const [opcoesAtendimento, listaResponsaveis] = await Promise.all([
    atendimentosParaVisita(),
    responsaveisDeVisita(),
  ]);

  // --- Agenda do próprio sistema: bloqueios -------------------------------
  // A agenda não depende mais do Google (13/10/2026): os avisos de "conecte
  // sua agenda" saíram desta tela. O Google continua opcional no perfil.
  const bloqueios: (Bloqueio & { vendedorNome: string | null })[] = await db
    .select({
      id: agendaBloqueios.id,
      vendedorId: agendaBloqueios.vendedorId,
      recorrencia: agendaBloqueios.recorrencia,
      data: agendaBloqueios.data,
      diaSemana: agendaBloqueios.diaSemana,
      inicioMin: agendaBloqueios.inicioMin,
      fimMin: agendaBloqueios.fimMin,
      ate: agendaBloqueios.ate,
      motivo: agendaBloqueios.motivo,
      vendedorNome: vendedores.nome,
    })
    .from(agendaBloqueios)
    .leftJoin(vendedores, eq(agendaBloqueios.vendedorId, vendedores.id))
    .where(filtroVendedor != null ? eq(agendaBloqueios.vendedorId, filtroVendedor) : undefined);
  const bloqueiosVigentes = bloqueios.filter((b) => !bloqueioEncerrado(b, hoje));
  // Privacidade (regra de 31/08/2026): o MOTIVO é do dono da agenda e do
  // gestor. A atendente vê só "Indisponível".
  const veMotivo = (vendedorId: number) =>
    usuario.papel === "gestor" || usuario.vendedorId === vendedorId;
  const podeMexerBloqueio = (vendedorId: number) =>
    usuario.papel === "gestor" ||
    (usuario.papel === "vendedor" && usuario.vendedorId === vendedorId);
  const podeBloquear = usuario.papel === "gestor" || usuario.papel === "vendedor";
  const vendedoresDaAgenda = listaResponsaveis.length
    ? listaResponsaveis
    : usuario.vendedorId != null
      ? [{ id: usuario.vendedorId, nome: usuario.nome ?? "Você" }]
      : [];

  const itensSemana: ItemDaSemana[] = [];
  if (modoSemana) {
    for (const v of linhas) {
      const ini = v.inicioEm.getHours() * 60 + v.inicioEm.getMinutes();
      itensSemana.push({
        tipo: "visita",
        id: v.id,
        dia: chaveDoDia(v.inicioEm),
        inicioMin: ini,
        fimMin: Math.min(24 * 60, ini + v.duracaoMin),
        titulo: v.clienteNome,
        detalhe: veTudo && filtroVendedor == null ? v.vendedorNome : null,
        situacao: v.situacao as SituacaoVisita,
        // Datas formatadas AQUI, no relógio do servidor — o mesmo que gravou.
        visita: {
          id: v.id,
          atendimentoId: v.atendimentoId,
          clienteNome: v.clienteNome,
          clienteTelefone: v.clienteTelefone,
          vendedorNome: v.vendedorNome,
          quando: primeiraMaiuscula(
            `${format(v.inicioEm, "EEEE, d/MM", { locale: ptBR })} · ${format(v.inicioEm, "HH:mm")} às ${format(fimDaVisita(v), "HH:mm")}`
          ),
          data: format(v.inicioEm, "dd/MM/yyyy"),
          hora: format(v.inicioEm, "HH:mm"),
          endereco: v.endereco,
          observacoes: v.observacoes,
          situacao: v.situacao as SituacaoVisita,
          edicao: {
            id: v.id,
            inicio: paraInputLocal(v.inicioEm),
            duracaoMin: v.duracaoMin,
            endereco: v.endereco,
            observacoes: v.observacoes,
            vendedorId: v.vendedorId,
          },
        },
      });
    }
    for (const dia of dias) {
      for (const b of bloqueios) {
        if (!valeNoDia(b, dia)) continue;
        itensSemana.push({
          tipo: "bloqueio",
          id: `b${b.id}-${dia}`,
          dia,
          inicioMin: b.inicioMin,
          fimMin: b.fimMin,
          titulo: veMotivo(b.vendedorId) && b.motivo ? b.motivo : "Indisponível",
          detalhe: veTudo && filtroVendedor == null ? b.vendedorNome : null,
        });
      }
    }
  }
  const linkSemana = (seg: string) => {
    const q = new URLSearchParams({ semana: seg });
    if (veTudo && filtroVendedor != null) q.set("de", String(filtroVendedor));
    return `/visitas?${q.toString()}`;
  };

  const paraAgenda = linhas.map((l) => ({
    ...l,
    situacao: l.situacao as SituacaoVisita,
  }));
  const diasLista = agruparPorDia<(typeof paraAgenda)[number]>(paraAgenda);
  const agora = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visitas</h1>
          <p className="text-sm text-muted-foreground">
            A agenda de campo: visitas e horários bloqueados de cada vendedor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GuiaDaTela
            titulo="Guia de Visitas"
            descricao="Agenda, visitas de venda, horários bloqueados e chamados de visita e manutenção."
            secoes={guiaDeVisitas(usuario.papel)}
          />
          <div className="flex rounded-lg border p-0.5">
            {(
              [
                ["Semana", "/visitas", modoSemana],
                ["Lista", "/visitas?ver=lista", ver === "lista"],
                ["Anteriores", "/visitas?ver=passadas", passadas],
              ] as const
            ).map(([rotulo, href, ativo]) => (
              <Link
                key={rotulo}
                href={href}
                className={
                  "rounded-md px-3 py-1.5 text-sm " +
                  (ativo ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground")
                }
              >
                {rotulo}
              </Link>
            ))}
          </div>
          {podeBloquear && (
            <BloqueioDialog
              trigger={<Button variant="outline">Bloquear horário</Button>}
              vendedores={vendedoresDaAgenda}
              vendedorFixo={
                usuario.papel === "vendedor" && usuario.vendedorId != null
                  ? { id: usuario.vendedorId, nome: usuario.nome ?? "Você" }
                  : undefined
              }
              hoje={hoje}
            />
          )}
          <VisitaDialog
            atendimentos={opcoesAtendimento}
            responsaveis={listaResponsaveis}
            ehAtendente={usuario.papel === "atendente"}
            trigger={<Button>Agendar visita</Button>}
          />
        </div>
      </div>

      {modoSemana && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={linkSemana(somarDias(segunda, -7))} scroll={false} />}>
                ← Anterior
              </Button>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={linkSemana(segundaDaSemana(hoje))} scroll={false} />}>
                Esta semana
              </Button>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={linkSemana(somarDias(segunda, 7))} scroll={false} />}>
                Próxima →
              </Button>
            </div>
            {veTudo && vendedoresDaAgenda.length > 1 && (
              <div className="flex flex-wrap gap-1 text-sm">
                {[{ id: null as number | null, nome: "Todos" }, ...vendedoresDaAgenda].map((v) => {
                  const q = new URLSearchParams({ semana: segunda });
                  if (v.id != null) q.set("de", String(v.id));
                  const ativo = (filtroVendedor ?? null) === v.id;
                  return (
                    <Link
                      key={v.id ?? "todos"}
                      href={`/visitas?${q.toString()}`}
                      scroll={false}
                      className={
                        "rounded-full border px-2.5 py-1 " +
                        (ativo ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")
                      }
                    >
                      {v.nome}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <AgendaSemana
            dias={dias}
            itens={itensSemana}
            hoje={hoje}
            responsaveis={listaResponsaveis}
            ehAtendente={usuario.papel === "atendente"}
          />

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Horários bloqueados</h2>
            {bloqueiosVigentes.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nenhum horário bloqueado.
                {podeBloquear &&
                  " Use “Bloquear horário” para tirar da agenda o que se repete toda semana — faculdade, curso — ou um dia de folga."}
              </p>
            ) : (
              <ul className="divide-y rounded-lg border bg-card">
                {bloqueiosVigentes.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span>
                      <span className="font-medium">{descreverBloqueio(b)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[
                          veTudo ? b.vendedorNome : null,
                          veMotivo(b.vendedorId) ? b.motivo : "Indisponível",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {podeMexerBloqueio(b.vendedorId) && (
                      <ExcluirConfirmado
                        titulo="Desbloquear este horário?"
                        descricao={`${descreverBloqueio(b)} volta a aparecer como livre para marcar visita.`}
                        excluir={excluirBloqueio.bind(null, b.id)}
                        sucesso="Horário desbloqueado"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {modoSemana ? null : diasLista.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {passadas
            ? "Nenhuma visita anterior."
            : "Nenhuma visita marcada. Use “Agendar visita” aqui em cima, ou abra o atendimento do cliente."}
        </p>
      ) : (
        <div className="space-y-6">
          {diasLista.map((dia) => {
            // A rota sai do endereço da empresa e segue a ordem dos horários.
            const rota = linkDaRota(dia.visitas, EMPRESA.endereco);
            const foraDaRota = paradasForaDaRota(dia.visitas);
            const emConflito = new Set(conflitos(dia.visitas));
            const ehHoje = isSameDay(dia.data, agora);

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
                      <CartaoClicavel href={`/atendimentos/${v.atendimentoId}`} key={v.id} className="flex flex-wrap gap-3 p-3">
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
                              className="text-primary hover:underline"
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

                        {/* No celular os alvos crescem para 40px e se afastam:
                            seletor, WhatsApp, editar e lixeira ficavam colados
                            em 28px, e o dedo acertava o vizinho. Ocupa a linha
                            inteira e quebra, senão estoura a largura da tela. */}
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:items-start sm:gap-1.5">
                          <span
                            className="size-2 rounded-full sm:mt-2"
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
                            className="h-10 px-3 sm:h-7 sm:px-2.5"
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
                          {/* Mudar o horário é o caso comum; antes só dava
                              para apagar e marcar de novo. */}
                          <VisitaDialog
                            visita={{
                              id: v.id,
                              inicio: paraInputLocal(v.inicioEm),
                              duracaoMin: v.duracaoMin,
                              endereco: v.endereco,
                              observacoes: v.observacoes,
                              vendedorId: v.vendedorId,
                            }}
                            atendimentoId={v.atendimentoId}
                            responsaveis={listaResponsaveis}
                            ehAtendente={usuario.papel === "atendente"}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Editar visita"
                                title="Editar visita"
                                className="size-10 sm:size-7"
                              >
                                <Pencil className="size-4" />
                              </Button>
                            }
                          />
                          <ExcluirVisitaButton
                            visitaId={v.id}
                            clienteNome={v.clienteNome}
                            data={format(v.inicioEm, "dd/MM/yyyy")}
                            hora={format(v.inicioEm, "HH:mm")}
                          />
                        </div>
                      </CartaoClicavel>
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
