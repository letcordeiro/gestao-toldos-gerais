import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import { cotacoes, orcamentos } from "@/db/schema";
import { exigirComercial } from "@/lib/auth";
import { formatarCentavos } from "@/lib/format";
import { compararCotacoes, melhorTotal, type SituacaoCotacao } from "@/lib/cotacoes";
import { urlBase } from "@/lib/url";
import { linkWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { itensDaCotacao, respostasDaCotacao } from "../consulta";
import {
  CopiarLink,
  LimparRespostaButton,
  SituacaoCotacaoSelect,
} from "./acoes-cotacao";

export const metadata = { title: "Cotação" };

export default async function CotacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirComercial();
  const { id } = await params;
  const cotacaoId = Number(id);
  if (!Number.isInteger(cotacaoId)) notFound();

  const cotacao = await db.query.cotacoes.findFirst({
    where: eq(cotacoes.id, cotacaoId),
  });
  if (!cotacao) notFound();

  const orcamento = cotacao.orcamentoId
    ? await db.query.orcamentos.findFirst({
        where: eq(orcamentos.id, cotacao.orcamentoId),
      })
    : null;

  const itens = await itensDaCotacao(cotacaoId);
  const respostas = await respostasDaCotacao(cotacaoId);
  const colunas = compararCotacoes(itens, respostas);
  const melhor = melhorTotal(colunas);
  const base = await urlBase();

  const mensagem = (nome: string, url: string) =>
    `Olá! Aqui é da Toldos Gerais. Estamos cotando material e queríamos o seu preço.\n\n${cotacao.titulo}\n\nÉ só preencher neste link: ${url}` +
    (cotacao.prazoResposta
      ? `\n\nSe puder responder até ${format(cotacao.prazoResposta, "dd/MM", { locale: ptBR })}, ajuda muito. Obrigado, ${nome}!`
      : "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/cotacoes"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Cotações
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {cotacao.titulo}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(cotacao.criadoEm, "dd/MM/yyyy", { locale: ptBR })}
            {cotacao.prazoResposta
              ? ` · responder até ${format(cotacao.prazoResposta, "dd/MM/yyyy", { locale: ptBR })}`
              : ""}
            {orcamento ? ` · orçamento ${orcamento.numero}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SituacaoCotacaoSelect
            cotacaoId={cotacao.id}
            situacao={cotacao.situacao as SituacaoCotacao}
          />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/cotacoes/${cotacao.id}/editar`} />}
          >
            Editar
          </Button>
        </div>
      </div>

      {cotacao.observacoesInternas && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Anotação interna — o fornecedor não vê
          </p>
          <p className="mt-1 whitespace-pre-line text-sm">
            {cotacao.observacoesInternas}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Convites</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada fornecedor tem um link próprio e não vê o preço dos outros.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {respostas.map((r) => {
              const url = base ? `${base}/cotacao/${r.token}` : "";
              return (
                <li
                  key={r.conviteId}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.fornecedorNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.respondidoEm
                        ? `respondeu em ${format(r.respondidoEm, "dd/MM/yyyy", { locale: ptBR })}`
                        : "aguardando resposta"}
                      {r.prazoEntrega ? ` · entrega ${r.prazoEntrega}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {url && <CopiarLink url={url} />}
                    {url && r.telefone && (
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <a
                            href={linkWhatsApp(
                              r.telefone,
                              mensagem(r.fornecedorNome, url)
                            )}
                            target="_blank"
                            rel="noopener"
                          />
                        }
                      >
                        WhatsApp
                      </Button>
                    )}
                    {r.respondidoEm && (
                      <LimparRespostaButton conviteId={r.conviteId} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {!base && (
            <p className="mt-2 text-xs text-muted-foreground">
              Configure a variável <code>APP_URL</code> para o sistema montar os
              links.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparação</CardTitle>
          <p className="text-sm text-muted-foreground">
            Em verde, o menor preço de cada item. O total só entra na disputa
            quando o fornecedor cotou a lista inteira.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-medium">Item</th>
                  {colunas.map((c) => (
                    <th
                      key={c.conviteId}
                      className="whitespace-nowrap px-3 py-2 text-right font-medium"
                    >
                      {c.fornecedorNome}
                      {!c.respondeu && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          sem resposta
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((item, linha) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      {item.descricao}
                      {(item.quantidade || item.unidade) && (
                        <span className="block text-xs text-muted-foreground">
                          {[item.quantidade, item.unidade]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      )}
                    </td>
                    {colunas.map((c) => {
                      const cel = c.celulas[linha];
                      return (
                        <td
                          key={c.conviteId}
                          className={
                            "px-3 py-2 text-right tabular-nums " +
                            (cel.melhor ? "font-semibold text-primary" : "")
                          }
                        >
                          {cel.valor == null
                            ? "—"
                            : formatarCentavos(cel.valor)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2">
                  <td className="py-2 pr-3 font-medium">Total</td>
                  {colunas.map((c) => (
                    <td
                      key={c.conviteId}
                      className={
                        "px-3 py-2 text-right font-semibold tabular-nums " +
                        (c.total != null && c.total === melhor && c.totalCompleto
                          ? "text-primary"
                          : "")
                      }
                    >
                      {c.total == null ? "—" : formatarCentavos(c.total)}
                      {c.total != null && !c.totalCompleto && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          cotação parcial
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {colunas.some((c) => c.observacao) && (
            <div className="mt-4 space-y-2">
              {colunas
                .filter((c) => c.observacao)
                .map((c) => (
                  <div key={c.conviteId} className="rounded-md bg-secondary p-2 text-sm">
                    <span className="font-medium">{c.fornecedorNome}:</span>{" "}
                    {c.observacao}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
