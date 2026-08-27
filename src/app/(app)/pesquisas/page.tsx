import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import { atendimentos, clientes, pesquisas, vendedores } from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import {
  CLASSE_COR,
  CLASSE_LABEL,
  calcularNps,
  classificar,
  faixaNps,
} from "@/lib/pesquisa";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Satisfação" };

export default async function PesquisasPage() {
  const usuario = await exigirUsuario();
  const veTudo = veFunilInteiro(usuario.papel);

  const linhas = await db
    .select({
      id: pesquisas.id,
      nota: pesquisas.nota,
      comentario: pesquisas.comentario,
      respondidaEm: pesquisas.respondidaEm,
      criadoEm: pesquisas.criadoEm,
      atendimentoId: pesquisas.atendimentoId,
      clienteNome: clientes.nome,
      vendedorNome: vendedores.nome,
    })
    .from(pesquisas)
    .innerJoin(atendimentos, eq(pesquisas.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(vendedores, eq(atendimentos.vendedorId, vendedores.id))
    .where(
      !veTudo && usuario.vendedorId != null
        ? eq(atendimentos.vendedorId, usuario.vendedorId)
        : undefined
    )
    .orderBy(desc(pesquisas.respondidaEm), desc(pesquisas.criadoEm));

  const respondidas = linhas.filter((l) => l.nota != null);
  const enviadasSemResposta = linhas.length - respondidas.length;
  const resumo = calcularNps(respondidas.map((l) => l.nota as number));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Satisfação</h1>
        <p className="text-sm text-muted-foreground">
          Respostas da pesquisa enviada depois da instalação. A nota vai de 0 a
          10 e o NPS é a diferença entre quem indicaria e quem não indicaria.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">NPS</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {resumo.nps ?? "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {faixaNps(resumo.nps)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Nota média</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {resumo.media ?? "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {resumo.respostas} resposta(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Distribuição</p>
            <div className="mt-2 space-y-1">
              {(["promotor", "neutro", "detrator"] as const).map((c) => {
                const n =
                  c === "promotor"
                    ? resumo.promotores
                    : c === "neutro"
                      ? resumo.neutros
                      : resumo.detratores;
                return (
                  <div key={c} className="flex items-center gap-2 text-xs">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: CLASSE_COR[c] }}
                    />
                    <span className="flex-1 truncate">{CLASSE_LABEL[c]}</span>
                    <span className="font-medium tabular-nums">{n}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sem resposta</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {enviadasSemResposta}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              link enviado, cliente não respondeu
            </p>
          </CardContent>
        </Card>
      </div>

      {linhas.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma pesquisa enviada ainda. Ela nasce quando uma automação com a
          variável <code>{"{pesquisa}"}</code> dispara — por padrão, no
          pós-venda.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {linhas.map((l) => (
            <li key={l.id} className="flex items-start gap-3 p-3">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
                style={{
                  backgroundColor:
                    l.nota == null ? "#CBD5E1" : CLASSE_COR[classificar(l.nota)],
                }}
              >
                {l.nota ?? "—"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  <Link
                    href={`/atendimentos/${l.atendimentoId}`}
                    className="hover:underline"
                  >
                    {l.clienteNome}
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.respondidaEm
                    ? `respondeu em ${format(l.respondidaEm, "dd/MM/yyyy", { locale: ptBR })}`
                    : `enviada em ${format(l.criadoEm, "dd/MM/yyyy", { locale: ptBR })} · sem resposta`}
                  {veTudo && l.vendedorNome ? ` · ${l.vendedorNome}` : ""}
                </p>
                {l.comentario && (
                  <p className="mt-1 whitespace-pre-line text-sm">
                    “{l.comentario}”
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
