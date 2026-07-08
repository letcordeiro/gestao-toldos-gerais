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
} from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FaseSelect } from "@/components/shared/fase-select";
import { atualizarObservacoes } from "../actions";

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

  const [atendimento] = await db
    .select({
      id: atendimentos.id,
      observacoes: atendimentos.observacoes,
      criadoEm: atendimentos.criadoEm,
      faseId: atendimentos.faseId,
      cliente: clientes,
    })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(eq(atendimentos.id, atendimentoId));

  if (!atendimento) notFound();

  const todasFases = await db.select().from(fases).orderBy(asc(fases.ordem));

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
            <p>
              <span className="text-muted-foreground">Telefone:</span>{" "}
              {cliente.telefone}
            </p>
            {cliente.email && (
              <p>
                <span className="text-muted-foreground">E-mail:</span>{" "}
                {cliente.email}
              </p>
            )}
            {cliente.endereco && (
              <p>
                <span className="text-muted-foreground">Endereço:</span>{" "}
                {cliente.endereco}
              </p>
            )}
            {cliente.cidade && (
              <p>
                <span className="text-muted-foreground">Cidade:</span>{" "}
                {cliente.cidade}
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
            <form action={atualizarObservacoes} className="space-y-3">
              <input
                type="hidden"
                name="atendimentoId"
                value={atendimento.id}
              />
              <Textarea
                name="observacoes"
                rows={5}
                defaultValue={atendimento.observacoes ?? ""}
                placeholder="Anotações do atendimento…"
              />
              <Button type="submit" variant="secondary" size="sm">
                Salvar observações
              </Button>
            </form>
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
