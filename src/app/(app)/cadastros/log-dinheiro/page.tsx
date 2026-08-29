import Link from "next/link";
import { desc } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import { logsDinheiro } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";
import { formatarCentavos } from "@/lib/format";
import {
  ACAO_DINHEIRO_COR,
  ACAO_DINHEIRO_LABEL,
  type AcaoDinheiro,
} from "@/lib/log-dinheiro";

export const metadata = { title: "Movimentos de dinheiro" };

export default async function LogDinheiroPage() {
  // Quem deu baixa em quanto é informação de gestão.
  await exigirGestor();

  const linhas = await db
    .select()
    .from(logsDinheiro)
    .orderBy(desc(logsDinheiro.criadoEm), desc(logsDinheiro.id))
    .limit(300);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Movimentos de dinheiro
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Quem deu baixa em parcela recebida e em comissão paga, quando, e de
          quanto era. Só o que mexe em dinheiro — o resto do sistema não é
          registrado aqui para esta lista continuar legível.
        </p>
      </div>

      {linhas.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum movimento ainda. A primeira baixa de parcela ou de comissão
          aparece aqui.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {linhas.map((l) => {
            const acao = l.acao as AcaoDinheiro;
            const destino = l.contratoId
              ? `/contratos/${l.contratoId}`
              : l.orcamentoId
                ? `/orcamentos/${l.orcamentoId}/ficha`
                : null;
            return (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: ACAO_DINHEIRO_COR[acao] }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {ACAO_DINHEIRO_LABEL[acao]}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {l.descricao}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.usuario} ·{" "}
                      {format(l.criadoEm, "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tabular-nums">
                    {l.valor == null ? (
                      <span className="text-xs text-muted-foreground">
                        sem valor
                      </span>
                    ) : (
                      formatarCentavos(l.valor)
                    )}
                  </span>
                  {destino && (
                    <Link
                      href={destino}
                      className="text-sm text-primary hover:underline"
                    >
                      Abrir
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
