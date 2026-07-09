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
import { exigirUsuario } from "@/lib/auth";
import { ObservacoesForm } from "./observacoes-form";
import { AtribuirVendedor } from "./atribuir-vendedor";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
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

  const ehGestor = usuario.papel === "gestor";
  // Vendedor responsável atual + (só gestor) lista para reatribuir.
  const vendedorAtual = atendimento.vendedorId
    ? await db.query.vendedores.findFirst({
        where: eq(vendedores.id, atendimento.vendedorId),
      })
    : null;
  const listaVendedores = ehGestor
    ? await db
        .select({ id: vendedores.id, nome: vendedores.nome })
        .from(vendedores)
        .where(eq(vendedores.ativo, true))
        .orderBy(asc(vendedores.nome))
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
        <div className="flex items-center gap-2">
          <FaseSelect
            atendimentoId={atendimento.id}
            faseId={atendimento.faseId}
            fases={todasFases}
          />
          <Button
            nativeButton={false}
            render={<Link href={`/orcamentos/novo?atendimento=${atendimento.id}`} />}
          >
            Novo orçamento
          </Button>
        </div>
      </div>

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
              <span className="text-muted-foreground">Origem:</span>{" "}
              <Badge variant="secondary">
                {cliente.origem === "auto_cadastro"
                  ? "Auto-cadastro"
                  : "Interno"}
              </Badge>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Vendedor:</span>{" "}
              {ehGestor ? (
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
