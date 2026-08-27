import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import { cotacoes } from "@/db/schema";
import { exigirComercial } from "@/lib/auth";
import { SITUACAO_COTACAO_LABEL, type SituacaoCotacao } from "@/lib/cotacoes";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Cotações" };

export default async function CotacoesPage() {
  await exigirComercial();

  const lista = await db
    .select({
      id: cotacoes.id,
      titulo: cotacoes.titulo,
      situacao: cotacoes.situacao,
      prazoResposta: cotacoes.prazoResposta,
      criadoEm: cotacoes.criadoEm,
      convidados: sql<number>`(
        select count(*) from cotacao_fornecedores cf
        where cf.cotacao_id = cotacoes.id
      )`,
      responderam: sql<number>`(
        select count(*) from cotacao_fornecedores cf
        where cf.cotacao_id = cotacoes.id and cf.respondido_em is not null
      )`,
    })
    .from(cotacoes)
    .orderBy(desc(cotacoes.criadoEm));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cotações</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Manda a lista de material para vários fornecedores de uma vez e
            compara as respostas lado a lado, antes de fechar o preço com o
            cliente.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/cotacoes/nova" />}>
          Nova cotação
        </Button>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma cotação ainda.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {lista.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  <Link href={`/cotacoes/${c.id}`} className="hover:underline">
                    {c.titulo}
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">
                  {SITUACAO_COTACAO_LABEL[c.situacao as SituacaoCotacao]} ·{" "}
                  {format(c.criadoEm, "dd/MM/yyyy", { locale: ptBR })}
                  {c.prazoResposta
                    ? ` · responder até ${format(c.prazoResposta, "dd/MM", { locale: ptBR })}`
                    : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {c.responderam} de {c.convidados} responderam
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
