import { CartaoClicavel } from "@/components/shared/item-clicavel";
import Link from "next/link";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  chamados,
  clientes,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import {
  SITUACAO_CHAMADO_COR,
  SITUACAO_CHAMADO_LABEL,
  SITUACOES_ABERTAS,
  TIPO_CHAMADO_LABEL,
  vendedorVeChamado,
  type SituacaoChamado,
} from "@/lib/chamados";
import { PRIORIDADE_COR } from "@/lib/tarefas";
import { combinaBusca } from "@/lib/busca-cliente";
import { Button } from "@/components/ui/button";
import { ChamadoDialog } from "./chamado-dialog";
import { BuscaChamados } from "./busca-chamados";
import { atendimentosParaChamado } from "./actions";

export const metadata = { title: "Chamados" };

export default async function ChamadosPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; q?: string }>;
}) {
  const { ver, q } = await searchParams;
  const busca = q?.trim() ?? "";
  const usuario = await exigirUsuario();
  const veTudo = veFunilInteiro(usuario.papel);
  const mostrarFechados = ver === "fechados";

  const linhas = await db
    .select({
      id: chamados.id,
      assunto: chamados.assunto,
      tipo: chamados.tipo,
      prioridade: chamados.prioridade,
      situacao: chamados.situacao,
      naGarantia: chamados.naGarantia,
      criadoEm: chamados.criadoEm,
      atendimentoId: chamados.atendimentoId,
      responsavelId: chamados.responsavelId,
      vendedorDoAtendimentoId: atendimentos.vendedorId,
      clienteNome: clientes.nome,
      numero: orcamentos.numero,
      responsavelNome: vendedores.nome,
    })
    .from(chamados)
    .innerJoin(atendimentos, eq(chamados.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(orcamentos, eq(chamados.orcamentoId, orcamentos.id))
    .leftJoin(vendedores, eq(chamados.responsavelId, vendedores.id))
    .where(
      mostrarFechados
        ? inArray(chamados.situacao, ["resolvido", "cancelado"])
        : inArray(chamados.situacao, SITUACOES_ABERTAS)
    )
    .orderBy(desc(chamados.criadoEm));

  // Vendedor só vê o que é dele — regra em `vendedorVeChamado`, a mesma da
  // tela do chamado e da ficha impressa.
  const visiveis = veTudo
    ? linhas
    : linhas.filter((l) => vendedorVeChamado(l, usuario.vendedorId));
  // Busca por assunto ou cliente, sem acento e sem caixa — a mesma regra do
  // seletor de cliente. Em memória, depois do filtro de quem pode ver.
  const lista = busca
    ? visiveis.filter((l) =>
        combinaBusca(`${l.assunto} ${l.clienteNome}`, busca)
      )
    : visiveis;

  // O par abertos/encerrados não pode desfazer a busca.
  const linkAlternar = (() => {
    const params = new URLSearchParams();
    if (!mostrarFechados) params.set("ver", "fechados");
    if (busca) params.set("q", busca);
    const query = params.toString();
    return query ? `/chamados?${query}` : "/chamados";
  })();

  // Para abrir o chamado daqui, sem ter que achar o atendimento antes.
  const opcoesAtendimento = await atendimentosParaChamado();
  // Só quem vê o funil inteiro escolhe o responsável; vendedor abre para si.
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chamados</h1>
          <p className="text-sm text-muted-foreground">
            O que aparece depois da instalação: goteira, lona, motor, ajuste. O
            chamado fica preso ao atendimento, então o histórico do cliente
            continua num lugar só.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={linkAlternar} scroll={false} />
            }
          >
            {mostrarFechados ? "Ver abertos" : "Ver encerrados"}
          </Button>
          <ChamadoDialog
            atendimentos={opcoesAtendimento}
            responsaveis={listaResponsaveis}
            irParaChamado
            trigger={<Button>Abrir chamado</Button>}
          />
        </div>
      </div>

      <BuscaChamados q={busca} ver={ver} />

      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {busca
            ? `Nenhum chamado ${mostrarFechados ? "encerrado" : "aberto"} com “${busca}”.`
            : mostrarFechados
              ? "Nenhum chamado encerrado."
              : "Nenhum chamado aberto."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {lista.map((c) => {
            const dias = differenceInCalendarDays(new Date(), c.criadoEm);
            return (
              <CartaoClicavel href={`/chamados/${c.id}`} key={c.id} className="flex items-start gap-3 p-3">
                <span
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      SITUACAO_CHAMADO_COR[c.situacao as SituacaoChamado],
                  }}
                  title={SITUACAO_CHAMADO_LABEL[c.situacao as SituacaoChamado]}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    <Link
                      href={`/chamados/${c.id}`}
                      className="text-primary hover:underline"
                    >
                      {c.assunto}
                    </Link>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <Link
                      href={`/atendimentos/${c.atendimentoId}`}
                      className="hover:underline"
                    >
                      {c.clienteNome}
                    </Link>
                    <span>· {SITUACAO_CHAMADO_LABEL[c.situacao as SituacaoChamado]}</span>
                    <span className="inline-flex items-center gap-1">
                      ·
                      <span
                        className="size-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            PRIORIDADE_COR[
                              c.prioridade as keyof typeof PRIORIDADE_COR
                            ],
                        }}
                      />
                      {c.prioridade}
                    </span>
                    <span>· {TIPO_CHAMADO_LABEL[c.tipo as "receptivo" | "ativo"]}</span>
                    {c.numero && <span>· {c.numero}</span>}
                    {c.naGarantia === true && (
                      <span className="font-medium text-primary">· na garantia</span>
                    )}
                    {c.naGarantia === false && (
                      <span className="font-medium text-destructive">
                        · fora da garantia
                      </span>
                    )}
                    <span>
                      · {dias === 0 ? "aberto hoje" : dias === 1 ? "aberto há 1 dia" : `aberto há ${dias} dias`}
                    </span>
                    {veTudo && c.responsavelNome && (
                      <span>· {c.responsavelNome}</span>
                    )}
                  </p>
                </div>
              </CartaoClicavel>
            );
          })}
        </ul>
      )}
    </div>
  );
}
