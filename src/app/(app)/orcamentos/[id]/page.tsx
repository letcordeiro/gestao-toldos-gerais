import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  modelosToldo,
  orcamentoItens,
  orcamentos,
} from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatarValorItem } from "@/lib/format";
import { EMPRESA } from "@/lib/empresa";
import { MONTAGEM_COBERTURA } from "@/lib/proposta";
import { StatusSelect } from "./status-select";

function linkWhatsApp(telefone: string, nome: string, numero: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const completo = digitos.startsWith("55") ? digitos : `55${digitos}`;
  const primeiroNome = nome.split(" ")[0];
  const mensagem =
    `Olá, ${primeiroNome}! Segue a Proposta Técnica Comercial nº ${numero} da Toldos Gerais. ` +
    `Qualquer dúvida, estamos à disposição. ${EMPRESA.telefoneFixo} · ${EMPRESA.site}`;
  return `https://wa.me/${completo}?text=${encodeURIComponent(mensagem)}`;
}

export default async function OrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orcamentoId = Number(id);
  if (!Number.isInteger(orcamentoId)) notFound();

  const [orcamento] = await db
    .select({
      orc: orcamentos,
      atendimentoId: atendimentos.id,
      cliente: clientes,
      modeloNome: modelosToldo.nome,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(modelosToldo, eq(orcamentos.modeloId, modelosToldo.id))
    .where(eq(orcamentos.id, orcamentoId));

  if (!orcamento) notFound();

  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, orcamentoId))
    .orderBy(asc(orcamentoItens.ordem));

  const { orc, cliente } = orcamento;

  const secoes: Array<{ titulo: string; texto: string | null }> = [
    { titulo: "MODELO", texto: orcamento.modeloNome },
    { titulo: "DESCRIÇÃO DO MATERIAL", texto: orc.descricaoMaterial },
    {
      titulo: `ESTRUTURA${orc.tipoEstrutura ? ` (${orc.tipoEstrutura === "aluminio" ? "alumínio" : "ferro"})` : ""}`,
      texto: orc.estruturaTexto,
    },
    { titulo: "FIXAÇÃO E VEDAÇÃO DA ESTRUTURA", texto: orc.fixacaoVedacao },
    { titulo: "MONTAGEM DA COBERTURA", texto: MONTAGEM_COBERTURA },
    { titulo: "GARANTIA", texto: orc.garantiaTexto },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/orcamentos"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Orçamentos
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Orçamento {orc.numero}
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/atendimentos/${orcamento.atendimentoId}`}
              className="hover:underline"
            >
              {cliente.nome}
            </Link>{" "}
            · {format(orc.criadoEm, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect orcamentoId={orc.id} status={orc.status} />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/orcamentos/${orc.id}/editar`} />}
          >
            Editar
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={`/orcamentos/${orc.id}/pdf`}
                target="_blank"
                rel="noopener"
              />
            }
          >
            Baixar PDF
          </Button>
          <Button
            nativeButton={false}
            render={
              <a
                href={linkWhatsApp(cliente.telefone, cliente.nome, orc.numero)}
                target="_blank"
                rel="noopener"
              />
            }
          >
            Enviar no WhatsApp
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Proposta Técnica Comercial
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Belo Horizonte,{" "}
            {format(orc.criadoEm, "d 'de' MMMM 'de' yyyy", { locale: ptBR })} ·
            A/c de {cliente.nome} {cliente.telefone}
            {cliente.endereco ? ` · ${cliente.endereco}` : ""}
            {cliente.cidade ? ` — ${cliente.cidade}` : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {secoes.map(
            (secao) =>
              secao.texto && (
                <div key={secao.titulo}>
                  <h3 className="font-semibold text-primary">
                    {secao.titulo}
                  </h3>
                  <p className="whitespace-pre-line">{secao.texto}</p>
                </div>
              )
          )}

          <Separator />

          <div>
            <h3 className="font-semibold text-primary">VALOR DO ORÇAMENTO</h3>
            <ul className="mt-2 space-y-1.5">
              {itens.map((item) =>
                item.valorMin === null ? (
                  <li
                    key={item.id}
                    className="pt-2 font-medium text-muted-foreground"
                  >
                    {item.descricao}
                  </li>
                ) : (
                  <li key={item.id} className="flex items-baseline gap-2">
                    <span>{item.descricao}</span>
                    <span className="flex-1 border-b border-dotted border-muted-foreground/50" />
                    <span className="font-medium">
                      {formatarValorItem(item.valorMin, item.valorMax)}
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>

          {orc.formaPagamento && (
            <div>
              <h3 className="font-semibold text-primary">
                FORMA DE PAGAMENTO
              </h3>
              <p className="whitespace-pre-line">{orc.formaPagamento}</p>
            </div>
          )}
          {orc.prazoEntrega && (
            <div>
              <h3 className="font-semibold text-primary">PRAZO DE ENTREGA</h3>
              <p className="whitespace-pre-line">{orc.prazoEntrega}</p>
            </div>
          )}

          <Separator />
          <p className="text-xs text-muted-foreground">
            {EMPRESA.razaoSocial} — {EMPRESA.site} / {EMPRESA.emailVendas} —{" "}
            {EMPRESA.endereco} – {EMPRESA.telefoneFixo}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
