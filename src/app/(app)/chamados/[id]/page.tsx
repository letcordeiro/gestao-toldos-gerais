import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import {
  atendimentos,
  chamadoInteracoes,
  chamados,
  clientes,
  contratos,
  orcamentoInstalacao,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import {
  GARANTIA_COR,
  SITUACAO_CHAMADO_LABEL,
  TIPO_CHAMADO_LABEL,
  avaliarGarantia,
  type SituacaoChamado,
} from "@/lib/chamados";
import { linkWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChamadoDialog } from "../chamado-dialog";
import { NovaInteracao, SituacaoChamadoSelect } from "./interacoes";

export const metadata = { title: "Chamado" };

// Garantia padrão quando não há contrato dizendo outra coisa.
const GARANTIA_PADRAO_MESES = 12;

export default async function ChamadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chamadoId = Number(id);
  if (!Number.isInteger(chamadoId)) notFound();

  const usuario = await exigirUsuario();
  const veTudo = veFunilInteiro(usuario.papel);

  const [linha] = await db
    .select({
      chamado: chamados,
      cliente: clientes,
      numero: orcamentos.numero,
      responsavelNome: vendedores.nome,
    })
    .from(chamados)
    .innerJoin(atendimentos, eq(chamados.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(orcamentos, eq(chamados.orcamentoId, orcamentos.id))
    .leftJoin(vendedores, eq(chamados.responsavelId, vendedores.id))
    .where(eq(chamados.id, chamadoId));

  if (!linha) notFound();
  const { chamado, cliente } = linha;

  // Garantia: conta a partir da conclusão da instalação do serviço ligado ao
  // chamado. O prazo vem do contrato, se existir; senão, o padrão da casa.
  let garantia = avaliarGarantia(null, GARANTIA_PADRAO_MESES);
  if (chamado.orcamentoId) {
    const ficha = await db.query.orcamentoInstalacao.findFirst({
      where: eq(orcamentoInstalacao.orcamentoId, chamado.orcamentoId),
    });
    const contrato = await db.query.contratos.findFirst({
      where: eq(contratos.orcamentoId, chamado.orcamentoId),
      orderBy: desc(contratos.versao),
    });
    garantia = avaliarGarantia(
      ficha?.dataEntrega ?? null,
      contrato?.garantiaMeses ?? GARANTIA_PADRAO_MESES
    );
  }

  const interacoes = await db
    .select()
    .from(chamadoInteracoes)
    .where(eq(chamadoInteracoes.chamadoId, chamadoId))
    .orderBy(asc(chamadoInteracoes.criadoEm), asc(chamadoInteracoes.id));

  const orcamentosDoCliente = await db
    .select({ id: orcamentos.id, numero: orcamentos.numero })
    .from(orcamentos)
    .where(eq(orcamentos.atendimentoId, chamado.atendimentoId))
    .orderBy(desc(orcamentos.criadoEm));

  const listaResponsaveis = veTudo
    ? (
        await db
          .select({ id: vendedores.id, nome: vendedores.nome, papel: vendedores.papel })
          .from(vendedores)
          .where(eq(vendedores.ativo, true))
          .orderBy(asc(vendedores.nome))
      )
        .filter((v) => v.papel !== "atendente")
        .map((v) => ({ id: v.id, nome: v.nome }))
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/chamados"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Chamados
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {chamado.assunto}
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/atendimentos/${chamado.atendimentoId}`}
              className="hover:underline"
            >
              {cliente.nome}
            </Link>{" "}
            · {TIPO_CHAMADO_LABEL[chamado.tipo]} ·{" "}
            {format(chamado.criadoEm, "dd/MM/yyyy", { locale: ptBR })}
            {linha.numero ? ` · orçamento ${linha.numero}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SituacaoChamadoSelect
            chamadoId={chamado.id}
            situacao={chamado.situacao as SituacaoChamado}
          />
          <ChamadoDialog
            chamado={{
              id: chamado.id,
              assunto: chamado.assunto,
              descricao: chamado.descricao,
              tipo: chamado.tipo,
              prioridade: chamado.prioridade,
              naGarantia: chamado.naGarantia,
              responsavelId: chamado.responsavelId,
              orcamentoId: chamado.orcamentoId,
            }}
            atendimentoId={chamado.atendimentoId}
            orcamentos={orcamentosDoCliente}
            responsaveis={listaResponsaveis}
            trigger={<Button variant="outline">Editar</Button>}
          />
          <Button
            nativeButton={false}
            render={
              <a
                href={linkWhatsApp(cliente.telefone)}
                target="_blank"
                rel="noopener"
              />
            }
          >
            WhatsApp
          </Button>
        </div>
      </div>

      {/* A garantia é a primeira pergunta de todo chamado: quem paga a visita. */}
      <div
        className="rounded-lg border p-3"
        style={{
          borderColor: `${GARANTIA_COR[garantia.status]}66`,
          backgroundColor: `${GARANTIA_COR[garantia.status]}14`,
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Garantia
        </p>
        <p className="mt-0.5 text-sm font-medium">{garantia.texto}</p>
        {chamado.naGarantia != null && (
          <p className="mt-1 text-sm text-muted-foreground">
            Decidido pela equipe:{" "}
            <strong>
              {chamado.naGarantia ? "cobrir pela garantia" : "cobrar do cliente"}
            </strong>
            .
          </p>
        )}
        {!chamado.orcamentoId && (
          <p className="mt-1 text-xs text-muted-foreground">
            Ligue o chamado a um orçamento (botão Editar) para o sistema
            conseguir conferir o prazo.
          </p>
        )}
      </div>

      {chamado.descricao && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">O que o cliente relatou</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{chamado.descricao}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Histórico
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {SITUACAO_CHAMADO_LABEL[chamado.situacao as SituacaoChamado]}
              {linha.responsavelNome ? ` · ${linha.responsavelNome}` : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {interacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum retorno registrado ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {interacoes.map((i) => (
                <li key={i.id} className="border-l-2 pl-3 text-sm">
                  <p className="whitespace-pre-line">{i.texto}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {i.autor ?? "sistema"} ·{" "}
                    {format(i.criadoEm, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <NovaInteracao chamadoId={chamado.id} />
        </CardContent>
      </Card>
    </div>
  );
}
