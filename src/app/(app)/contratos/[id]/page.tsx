import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import {
  clientes,
  contratoAditivos,
  contratoEventos,
  contratoItens,
  contratoOpcoes,
  contratoPagamentos,
  contratos,
  orcamentoInstalacao,
  orcamentos,
} from "@/db/schema";
import { exigirUsuario, podeComercial } from "@/lib/auth";
import { urlBase } from "@/lib/url";
import { formatarCentavos } from "@/lib/format";
import { enderecoCompleto } from "@/lib/endereco";
import { carregarDadosContrato } from "@/lib/gerar-contrato";
import { ehPessoaJuridica } from "@/lib/contrato-clausulas";
import {
  compararComOrigem,
  lerSnapshot,
  podeFazer,
  temOpcoes,
  STATUS_LABEL,
  type SnapshotContrato,
  type StatusContrato,
} from "@/lib/contratos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContratoPreview } from "@/components/shared/contrato-preview";
import { AcoesContrato } from "./acoes-contrato";
import { ContratoForm } from "./contrato-form";
import { DocumentoCliente } from "./documento-cliente";
import { ItensContrato } from "./itens-contrato";
import { OpcoesPreco } from "./opcoes-preco";
import { PlanoPagamento } from "./plano-pagamento";
import { Recebimentos } from "./recebimentos";

export const metadata = { title: "Contrato" };

const STATUS_VARIANT: Record<
  StatusContrato,
  "secondary" | "default" | "destructive" | "outline"
> = {
  rascunho: "outline",
  emitido: "secondary",
  assinado: "default",
  aditivado: "default",
  cancelado: "destructive",
};

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contratoId = Number(id);
  if (!Number.isInteger(contratoId) || contratoId <= 0) notFound();

  const usuario = await exigirUsuario();

  const [linha] = await db
    .select({ contrato: contratos, cliente: clientes, orcamento: orcamentos })
    .from(contratos)
    .innerJoin(clientes, eq(contratos.clienteId, clientes.id))
    .innerJoin(orcamentos, eq(contratos.orcamentoId, orcamentos.id))
    .where(eq(contratos.id, contratoId));
  if (!linha) notFound();

  // Vendedor só acessa contrato de orçamento dele.
  if (
    usuario.papel === "vendedor" &&
    linha.orcamento.vendedorId !== usuario.vendedorId
  ) {
    notFound();
  }

  const { contrato, cliente, orcamento } = linha;
  const status = contrato.status as StatusContrato;
  // Atendente consulta o contrato, não mexe nele.
  const ehComercial = podeComercial(usuario.papel);
  const editavel = ehComercial && podeFazer(status, "editar");

  const carregado = await carregarDadosContrato(eq(contratos.id, contratoId));
  if (!carregado) notFound();

  // Parcelas com id — o plano de pagamento trabalha com linhas sem id, mas a
  // baixa de recebimento precisa saber qual linha é qual.
  const parcelasContrato = await db
    .select({
      id: contratoPagamentos.id,
      rotulo: contratoPagamentos.rotulo,
      valor: contratoPagamentos.valor,
      meio: contratoPagamentos.meio,
      gatilho: contratoPagamentos.gatilho,
      diasApos: contratoPagamentos.diasApos,
      dataVencimento: contratoPagamentos.dataVencimento,
      pagoEm: contratoPagamentos.pagoEm,
    })
    .from(contratoPagamentos)
    .where(eq(contratoPagamentos.contratoId, contratoId))
    .orderBy(asc(contratoPagamentos.ordem));

  // Conclusão da instalação: a data que faz vencer as parcelas presas a ela.
  const fichaInstalacao = await db.query.orcamentoInstalacao.findFirst({
    where: eq(orcamentoInstalacao.orcamentoId, contrato.orcamentoId),
  });
  const dataEntregaInstalacao = fichaInstalacao?.dataEntrega ?? null;

  const itens = await db
    .select()
    .from(contratoItens)
    .where(eq(contratoItens.contratoId, contratoId))
    .orderBy(asc(contratoItens.ordem));

  const opcoes = await db
    .select()
    .from(contratoOpcoes)
    .where(eq(contratoOpcoes.contratoId, contratoId))
    .orderBy(asc(contratoOpcoes.ordem));
  const modoOpcoes = temOpcoes(opcoes);

  const eventos = await db
    .select()
    .from(contratoEventos)
    .where(eq(contratoEventos.contratoId, contratoId))
    .orderBy(asc(contratoEventos.criadoEm));

  const aditivos = await db
    .select()
    .from(contratoAditivos)
    .where(eq(contratoAditivos.contratoId, contratoId))
    .orderBy(asc(contratoAditivos.numero));

  // Divergência com o orçamento de origem — avisa, nunca sincroniza sozinho.
  const snapshot = lerSnapshot(contrato.snapshot);
  const itensOrcamento = await db.query.orcamentoItens.findMany({
    where: (t, { eq: igual }) => igual(t.orcamentoId, contrato.orcamentoId),
  });
  const atual: SnapshotContrato = {
    cliente: {
      nome: cliente.nome,
      documento: cliente.documento,
      endereco: enderecoCompleto(cliente) || null,
      telefone: cliente.telefone,
      email: cliente.email,
    },
    orcamento: {
      numero: orcamento.numero,
      status: orcamento.status,
      valorTotal: itensOrcamento.reduce((s, i) => s + (i.valorMin ?? 0), 0),
    },
  };
  const divergencias = compararComOrigem(snapshot, atual);

  const base = (await urlBase()) ?? "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* Volta para o orçamento de origem, não para uma lista de
              contratos — ela não existe mais. */}
          <Link
            href={`/orcamentos/${contrato.orcamentoId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Orçamento {orcamento.numero}
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {contrato.numero ?? "Contrato (minuta)"}
            <Badge variant={STATUS_VARIANT[status]}>
              {STATUS_LABEL[status]}
            </Badge>
            {contrato.versao > 1 && (
              <Badge variant="outline">versão {contrato.versao}</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {cliente.nome} · orçamento{" "}
            <Link
              href={`/orcamentos/${orcamento.id}`}
              className="text-primary hover:underline"
            >
              {orcamento.numero}
            </Link>{" "}
            ·{" "}
            {modoOpcoes
              ? `${opcoes.length} opções: ${opcoes
                  .map((o) => formatarCentavos(o.valor))
                  .join(" ou ")}`
              : formatarCentavos(contrato.valorTotal)}
          </p>
        </div>
      </div>

      {ehComercial ? (
        <AcoesContrato
          contratoId={contrato.id}
          status={status}
          publicToken={contrato.publicToken}
          urlBase={base}
        />
      ) : null}

      {contrato.status === "cancelado" && contrato.motivoCancelamento && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm">
          <strong>Cancelado:</strong> {contrato.motivoCancelamento}
          {contrato.valorRetido != null && (
            <>
              {" "}
              · Retenção registrada de{" "}
              <strong>{formatarCentavos(contrato.valorRetido)}</strong> (
              {contrato.retencaoPercent}% do total)
            </>
          )}
        </div>
      )}

      {divergencias.length > 0 && (
        <div
          className="rounded-lg border border-brand-orange bg-brand-orange/10 p-3"
          role="alert"
        >
          <p className="text-sm font-semibold">
            O orçamento de origem mudou depois da emissão deste contrato
          </p>
          <p className="text-xs text-muted-foreground">
            O contrato mantém o que foi congelado na emissão. Se precisar
            atualizar, gere uma nova versão (antes da assinatura) ou um aditivo.
          </p>
          <ul className="mt-2 space-y-0.5 text-sm">
            {divergencias.map((d) => (
              <li key={d.campo}>
                <strong>{d.campo}:</strong> no contrato “{d.noContrato}” · hoje “
                {d.hoje}”
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Edição */}
        <div className="space-y-4">
          {!ehComercial ? (
            <p className="rounded-lg border bg-secondary/40 p-3 text-sm text-muted-foreground">
              Somente consulta — contrato é do vendedor responsável.
            </p>
          ) : (
            !editavel && (
              <p className="rounded-lg border bg-secondary/40 p-3 text-sm text-muted-foreground">
                Contrato {STATUS_LABEL[status].toLowerCase()} — os dados estão
                congelados. Use <strong>Nova versão</strong> (antes da
                assinatura) ou <strong>Gerar aditivo</strong> (depois) para
                mudar algo.
              </p>
            )
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contratante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <strong>{cliente.nome}</strong>
                <br />
                <span className="text-muted-foreground">
                  {enderecoCompleto(cliente) || "sem endereço cadastrado"}
                </span>
                <br />
                <span className="text-muted-foreground">
                  {cliente.telefone}
                  {cliente.email ? ` · ${cliente.email}` : ""}
                </span>
              </p>
              <DocumentoCliente
                clienteId={cliente.id}
                documentoInicial={cliente.documento ?? ""}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <ContratoForm
                editavel={editavel}
                inicial={{
                  contratoId: contrato.id,
                  escopo: contrato.escopo,
                  localInstalacao: contrato.localInstalacao,
                  observacoesTecnicas: contrato.observacoesTecnicas ?? "",
            observacoesInternas: contrato.observacoesInternas ?? "",
                  valorTotal: contrato.valorTotal,
                  prazoDiasUteis: contrato.prazoDiasUteis,
                  garantiaMeses: contrato.garantiaMeses,
                  retencaoPercent: contrato.retencaoPercent,
                  multaPercent: contrato.multaPercent,
                  jurosMesPercent: contrato.jurosMesPercent,
                  flagMedidas: contrato.flagMedidas,
                  flagClima: contrato.flagClima,
                  flagEnergia: contrato.flagEnergia,
                  flagSobMedida: contrato.flagSobMedida,
                  representante: contrato.representante,
                  representanteContratante: contrato.representanteContratante,
                  clienteEhEmpresa: ehPessoaJuridica(cliente.documento),
                  modoOpcoes,
                  cidadeEmissao: contrato.cidadeEmissao,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itens</CardTitle>
            </CardHeader>
            <CardContent>
              <ItensContrato
                contratoId={contrato.id}
                editavel={editavel}
                itensIniciais={itens.map((i) => ({
                  modelo: i.modelo,
                  cor: i.cor ?? "",
                  medidasM2: i.medidasM2 ?? "",
                  descricaoExtra: i.descricaoExtra ?? "",
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opções de preço</CardTitle>
            </CardHeader>
            <CardContent>
              <OpcoesPreco
                contratoId={contrato.id}
                editavel={editavel}
                opcoesIniciais={opcoes.map((o) => ({
                  rotulo: o.rotulo,
                  valor: o.valor,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plano de pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanoPagamento
                contratoId={contrato.id}
                valorTotal={contrato.valorTotal}
                editavel={editavel}
                modoOpcoes={modoOpcoes}
                linhasIniciais={carregado.dados.pagamentos}
              />
            </CardContent>
          </Card>

          {/* Depois de assinado, o que importa é o que entrou — não o que foi
              combinado. Por isso a baixa fica num cartão próprio. */}
          {(contrato.status === "assinado" ||
            contrato.status === "aditivado") &&
            parcelasContrato.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recebimentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Recebimentos
                    parcelas={parcelasContrato}
                    dataAssinatura={contrato.dataAssinatura}
                    dataEntrega={dataEntregaInstalacao}
                  />
                </CardContent>
              </Card>
            )}

          {aditivos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Aditivos ({aditivos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {aditivos.map((a) => (
                  <div key={a.id} className="rounded-md border p-2">
                    <p className="font-medium">
                      Aditivo nº {a.numero}
                      {a.dataAssinatura
                        ? ` · ${format(a.dataAssinatura, "dd/MM/yyyy")}`
                        : ""}
                    </p>
                    <p className="text-muted-foreground">{a.objeto}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.deltaValor === 0
                        ? "Sem alteração de valor"
                        : `${a.deltaValor > 0 ? "+" : "−"} ${formatarCentavos(
                            Math.abs(a.deltaValor)
                          )}`}
                      {a.novoPrazoDiasUteis != null
                        ? ` · novo prazo ${a.novoPrazoDiasUteis} dias úteis`
                        : ""}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {eventos.map((e) => (
                <p key={e.id} className="text-muted-foreground">
                  <span className="text-foreground">
                    {format(e.criadoEm, "dd/MM/yyyy HH:mm")}
                  </span>{" "}
                  · {e.descricao}
                  {e.usuario ? ` · ${e.usuario}` : ""}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Prévia */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Prévia do documento</CardTitle>
              <Button
                nativeButton={false}
                variant="outline"
                size="sm"
                render={<Link href={`/contratos/${contrato.id}/imprimir`} />}
              >
                Imprimir
              </Button>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              <ContratoPreview dados={carregado.dados} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
