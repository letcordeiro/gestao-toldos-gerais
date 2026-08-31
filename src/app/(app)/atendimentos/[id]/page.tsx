import Link from "next/link";
import { notFound } from "next/navigation";
import { alias } from "drizzle-orm/sqlite-core";
import { asc, desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  historicoFases,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FaseSelect } from "@/components/shared/fase-select";
import { linkWhatsApp } from "@/lib/whatsapp";
import { enderecoCompleto } from "@/lib/endereco";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import { buscarTarefas } from "@/lib/tarefas-consulta";
import { canais, chamados, motivosPerda } from "@/db/schema";
import {
  SITUACAO_CHAMADO_COR,
  SITUACAO_CHAMADO_LABEL,
  SITUACOES_ABERTAS,
  type SituacaoChamado,
} from "@/lib/chamados";
import { ChamadoDialog } from "../../chamados/chamado-dialog";
import { VisitaDialog } from "../../visitas/visita-dialog";
import { ListaTarefas } from "../../tarefas/lista-tarefas";
import { TarefaDialog } from "../../tarefas/tarefa-dialog";
import { CanalSelect } from "./canal-select";
import { ObservacoesForm } from "./observacoes-form";
import { AtribuirVendedor } from "./atribuir-vendedor";

export const metadata = { title: "Atendimento" };


const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  agendado: "Aguardando envio",
  enviando: "Enviando",
  enviado: "Enviado",
  falha_envio: "Falha no envio",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export default async function AtendimentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const atendimentoId = Number(id);
  if (!Number.isInteger(atendimentoId)) notFound();

  const usuario = await exigirUsuario();

  const [atendimento] = await db
    .select({
      id: atendimentos.id,
      observacoes: atendimentos.observacoes,
      criadoEm: atendimentos.criadoEm,
      faseId: atendimentos.faseId,
      vendedorId: atendimentos.vendedorId,
      canalId: atendimentos.canalId,
      motivoPerdaId: atendimentos.motivoPerdaId,
      motivoPerdaObs: atendimentos.motivoPerdaObs,
      cliente: clientes,
    })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(eq(atendimentos.id, atendimentoId));

  if (!atendimento) notFound();

  // Vendedor só acessa os próprios atendimentos.
  if (
    usuario.papel === "vendedor" &&
    atendimento.vendedorId !== usuario.vendedorId
  ) {
    notFound();
  }

  const todasFases = await db.select().from(fases).orderBy(asc(fases.ordem));

  // Gestor e atendente redirecionam o cliente entre os vendedores.
  const podeDirecionar = veFunilInteiro(usuario.papel);
  // Vendedor responsável atual + lista para reatribuir (gestor e atendente).
  const vendedorAtual = atendimento.vendedorId
    ? await db.query.vendedores.findFirst({
        where: eq(vendedores.id, atendimento.vendedorId),
      })
    : null;
  const listaVendedores = podeDirecionar
    ? (
        await db
          .select({
            id: vendedores.id,
            nome: vendedores.nome,
            papel: vendedores.papel,
          })
          .from(vendedores)
          .where(eq(vendedores.ativo, true))
          .orderBy(asc(vendedores.nome))
      )
        // Atendente não atende cliente: não entra como responsável.
        .filter((v) => v.papel !== "atendente")
        .map((v) => ({ id: v.id, nome: v.nome }))
    : [];

  const faseAnterior = alias(fases, "fase_anterior");
  const historico = await db
    .select({
      id: historicoFases.id,
      data: historicoFases.data,
      anterior: faseAnterior.nome,
      nova: fases.nome,
      novaCor: fases.cor,
    })
    .from(historicoFases)
    .innerJoin(fases, eq(historicoFases.faseNovaId, fases.id))
    .leftJoin(faseAnterior, eq(historicoFases.faseAnteriorId, faseAnterior.id))
    .where(eq(historicoFases.atendimentoId, atendimentoId))
    .orderBy(desc(historicoFases.data), desc(historicoFases.id));

  const orcamentosDoAtendimento = await db
    .select()
    .from(orcamentos)
    .where(eq(orcamentos.atendimentoId, atendimentoId))
    .orderBy(desc(orcamentos.criadoEm));

  const { cliente } = atendimento;

  // Tarefas deste atendimento — é a resposta para "e agora?".
  const tarefas = await buscarTarefas({ atendimentoId });
  const pendentes = tarefas.filter((t) => t.status === "pendente");

  // Link de agendamento do vendedor responsável (Cal.com, Calendly, Google
  // Agenda no Workspace). Só aparece o botão se ele tiver cadastrado um.
  const linkAgendamento = vendedorAtual?.linkAgendamento ?? null;

  const listaCanais = await db
    .select({ id: canais.id, nome: canais.nome })
    .from(canais)
    .where(eq(canais.ativo, true))
    .orderBy(asc(canais.ordem), asc(canais.id));

  // Chamados de pós-venda deste cliente.
  const chamadosDoAtendimento = await db
    .select({
      id: chamados.id,
      assunto: chamados.assunto,
      situacao: chamados.situacao,
      criadoEm: chamados.criadoEm,
    })
    .from(chamados)
    .where(eq(chamados.atendimentoId, atendimentoId))
    .orderBy(desc(chamados.criadoEm));

  // Motivo da perda, quando o atendimento está numa fase de negócio perdido.
  const faseAtual = todasFases.find((f) => f.id === atendimento.faseId);
  const motivo = atendimento.motivoPerdaId
    ? await db.query.motivosPerda.findFirst({
        where: eq(motivosPerda.id, atendimento.motivoPerdaId),
      })
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/atendimentos"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Atendimentos
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {cliente.nome}
          </h1>
        </div>
        {/* flex-wrap é obrigatório: são cinco botões e, sem quebrar linha, no
            celular os últimos ("Abrir chamado", "Novo orçamento") saem para
            fora da tela sem barra de rolagem — deixam de existir para quem usa. */}
        <div className="flex flex-wrap items-center gap-2">
          <FaseSelect
            atendimentoId={atendimento.id}
            faseId={atendimento.faseId}
            fases={todasFases}
          />
          <TarefaDialog
            atendimentoId={atendimento.id}
            responsaveis={listaVendedores}
            trigger={<Button variant="outline">Nova tarefa</Button>}
          />
          {linkAgendamento && (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={linkWhatsApp(
                    cliente.telefone,
                    `Olá, ${cliente.nome.split(" ")[0]}! Aqui é da Toldos Gerais. ` +
                      `Para marcar a visita técnica no melhor horário para você, ` +
                      `é só escolher um horário aqui: ${linkAgendamento}`
                  )}
                  target="_blank"
                  rel="noopener"
                />
              }
            >
              Mandar link de agendamento
            </Button>
          )}
          <VisitaDialog
            atendimentoId={atendimento.id}
            responsaveis={listaVendedores}
            ehAtendente={usuario.papel === "atendente"}
            trigger={<Button variant="outline">Agendar visita</Button>}
          />
          <ChamadoDialog
            atendimentoId={atendimento.id}
            orcamentos={orcamentosDoAtendimento.map((o) => ({
              id: o.id,
              numero: o.numero,
            }))}
            responsaveis={listaVendedores}
            irParaChamado
            trigger={<Button variant="outline">Abrir chamado</Button>}
          />
          <Button
            nativeButton={false}
            render={<Link href={`/orcamentos/novo?atendimento=${atendimento.id}`} />}
          >
            Novo orçamento
          </Button>
        </div>
      </div>

      {faseAtual?.ehPerdido && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
            Negócio perdido
          </p>
          <p className="mt-1 text-sm">
            {motivo?.nome ?? "Motivo não informado"}
            {atendimento.motivoPerdaObs
              ? ` — ${atendimento.motivoPerdaObs}`
              : ""}
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">
            Tarefas
            {pendentes.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {pendentes.length} pendente{pendentes.length > 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
          <TarefaDialog
            atendimentoId={atendimento.id}
            responsaveis={listaVendedores}
            trigger={
              <Button variant="ghost" size="sm">
                + Tarefa
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          <ListaTarefas
            tarefas={tarefas}
            responsaveis={listaVendedores}
            mostrarCliente={false}
            vazio="Nenhuma tarefa combinada para este cliente."
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <span>
                <span className="text-muted-foreground">Telefone:</span>{" "}
                {cliente.telefone}
              </span>
              <a
                href={linkWhatsApp(cliente.telefone)}
                target="_blank"
                rel="noopener"
                className="text-xs font-medium text-primary hover:underline"
              >
                WhatsApp ↗
              </a>
            </p>
            {cliente.email && (
              <p>
                <span className="text-muted-foreground">E-mail:</span>{" "}
                {cliente.email}
              </p>
            )}
            {enderecoCompleto(cliente) && (
              <p>
                <span className="text-muted-foreground">Endereço:</span>{" "}
                {enderecoCompleto(cliente)}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Cadastro:</span>{" "}
              <Badge variant="secondary">
                {cliente.origem === "auto_cadastro"
                  ? "Auto-cadastro"
                  : "Interno"}
              </Badge>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Chegou por:</span>
              <CanalSelect
                atendimentoId={atendimento.id}
                canalId={atendimento.canalId}
                canais={listaCanais}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Vendedor:</span>{" "}
              {podeDirecionar ? (
                <AtribuirVendedor
                  atendimentoId={atendimento.id}
                  vendedorId={atendimento.vendedorId}
                  vendedores={listaVendedores}
                />
              ) : (
                <span className="font-medium">
                  {vendedorAtual?.nome ?? "—"}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              Atendimento criado em{" "}
              {format(atendimento.criadoEm, "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <ObservacoesForm
              atendimentoId={atendimento.id}
              valorInicial={atendimento.observacoes ?? ""}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orçamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {orcamentosDoAtendimento.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum orçamento para este atendimento.
              </p>
            ) : (
              <ul className="space-y-2">
                {orcamentosDoAtendimento.map((orc) => (
                  <li
                    key={orc.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <Link
                      href={`/orcamentos/${orc.id}`}
                      className="font-medium hover:underline"
                    >
                      Orçamento {orc.numero}
                    </Link>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {format(orc.criadoEm, "dd/MM/yyyy")}
                      <Badge variant="outline">
                        {STATUS_LABEL[orc.status]}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {chamadosDoAtendimento.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Chamados
                {chamadosDoAtendimento.filter((c) =>
                  SITUACOES_ABERTAS.includes(c.situacao as SituacaoChamado)
                ).length > 0 && (
                  <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    {
                      chamadosDoAtendimento.filter((c) =>
                        SITUACOES_ABERTAS.includes(c.situacao as SituacaoChamado)
                      ).length
                    }{" "}
                    aberto(s)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {chamadosDoAtendimento.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <Link
                      href={`/chamados/${c.id}`}
                      className="min-w-0 flex-1 truncate font-medium hover:underline"
                    >
                      {c.assunto}
                    </Link>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor:
                            SITUACAO_CHAMADO_COR[c.situacao as SituacaoChamado],
                        }}
                      />
                      {SITUACAO_CHAMADO_LABEL[c.situacao as SituacaoChamado]}
                      {" · "}
                      {format(c.criadoEm, "dd/MM/yyyy")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de fases</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {historico.map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: h.novaCor }}
                  />
                  <div>
                    <p>
                      {h.anterior ? (
                        <>
                          <span className="text-muted-foreground">
                            {h.anterior}
                          </span>{" "}
                          → <span className="font-medium">{h.nova}</span>
                        </>
                      ) : (
                        <span className="font-medium">{h.nova}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(h.data, "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
