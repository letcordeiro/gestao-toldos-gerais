import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exigirGestor } from "@/lib/auth";
import { buscarComissoes } from "@/lib/instalacoes";
import { PAPEL_INSTALADOR_LABEL, valorDaComissao } from "@/lib/comissoes";
import { formatarCentavos } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PagarComissaoButton } from "./pagar-button";

export const metadata = { title: "Comissões de instalação" };

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  // Quanto a empresa deve é informação de gestão.
  await exigirGestor();

  const todas = await buscarComissoes();
  const mostrarPagas = ver === "pagas";
  const lista = todas.filter((c) => (mostrarPagas ? c.pagoEm : !c.pagoEm));

  // Agrupa por instalador: a pergunta é "quanto devo para o Zé", não
  // "quanto devo nesta obra".
  const porInstalador = new Map<string, typeof lista>();
  for (const c of lista) {
    porInstalador.set(c.instaladorNome, [
      ...(porInstalador.get(c.instaladorNome) ?? []),
      c,
    ]);
  }

  const totalAPagar = todas
    .filter((c) => !c.pagoEm)
    .reduce((s, c) => s + (valorDaComissao(c, c.valorOrcamento) ?? 0), 0);
  const totalPago = todas
    .filter((c) => c.pagoEm)
    .reduce((s, c) => s + (valorDaComissao(c, c.valorOrcamento) ?? 0), 0);
  const semValor = todas.filter(
    (c) => valorDaComissao(c, c.valorOrcamento) == null
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/instalacoes"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Instalações
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Comissões de instalação
          </h1>
          <p className="text-sm text-muted-foreground">
            Quanto a empresa deve por obra e para quem.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={
                mostrarPagas
                  ? "/instalacoes/comissoes"
                  : "/instalacoes/comissoes?ver=pagas"
              }
            />
          }
        >
          {mostrarPagas ? "Ver a pagar" : "Ver pagas"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">A pagar</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-orange-dark">
              {formatarCentavos(totalAPagar)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Já pago</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatarCentavos(totalPago)}
            </p>
          </CardContent>
        </Card>
        {semValor > 0 && (
          <Card className="col-span-2 lg:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Sem valor</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {semValor}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                orçamento sem valor fechado
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {mostrarPagas
            ? "Nenhuma comissão paga ainda."
            : "Nada a pagar. Monte a equipe na ficha de instalação para as comissões aparecerem aqui."}
        </p>
      ) : (
        <div className="space-y-5">
          {[...porInstalador.entries()].map(([nome, linhas]) => {
            const subtotal = linhas.reduce(
              (s, c) => s + (valorDaComissao(c, c.valorOrcamento) ?? 0),
              0
            );
            return (
              <section key={nome} className="space-y-1.5">
                <h2 className="flex items-baseline justify-between text-sm font-semibold">
                  {nome}
                  <span className="tabular-nums text-muted-foreground">
                    {formatarCentavos(subtotal)}
                  </span>
                </h2>
                <ul className="divide-y rounded-lg border bg-card">
                  {linhas.map((c) => {
                    const valor = valorDaComissao(c, c.valorOrcamento);
                    return (
                      <li
                        key={c.linhaId}
                        className="flex flex-wrap items-center justify-between gap-2 p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            <Link
                              href={`/orcamentos/${c.orcamentoId}/ficha`}
                              className="hover:underline"
                            >
                              {c.clienteNome}
                            </Link>{" "}
                            <span className="font-normal text-muted-foreground">
                              · {c.numero}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {PAPEL_INSTALADOR_LABEL[c.papel]} ·{" "}
                            {c.tipo === "percentual"
                              ? `${c.percentual}% do orçamento`
                              : "valor fixo"}
                            {c.dataEntrega
                              ? ` · entregue em ${format(c.dataEntrega, "dd/MM/yyyy", { locale: ptBR })}`
                              : " · sem data de entrega"}
                            {c.pagoEm
                              ? ` · pago em ${format(c.pagoEm, "dd/MM/yyyy", { locale: ptBR })}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums">
                            {valor == null ? (
                              <span className="text-xs text-muted-foreground">
                                sem valor
                              </span>
                            ) : (
                              formatarCentavos(valor)
                            )}
                          </span>
                          <PagarComissaoButton
                            linhaId={c.linhaId}
                            paga={c.pagoEm != null}
                          />
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
