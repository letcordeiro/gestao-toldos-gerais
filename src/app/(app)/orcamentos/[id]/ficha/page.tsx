import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  instalacaoItens,
  orcamentoInstalacao,
  orcamentos,
} from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { enderecoCompleto } from "@/lib/endereco";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InstalacaoForm,
  type DadosInstalacao,
  type LinhaInstalacao,
} from "../instalacao-form";
import { AcoesFicha } from "./acoes-ficha";

export default async function FichaInstalacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const orcamentoId = Number(id);
  if (!Number.isInteger(orcamentoId)) notFound();

  const [linha] = await db
    .select({
      orc: orcamentos,
      cliente: clientes,
      faseNome: fases.nome,
      faseLibera: fases.liberaInstalacao,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .where(eq(orcamentos.id, orcamentoId));

  if (!linha) notFound();
  if (usuario.papel === "vendedor" && linha.orc.vendedorId !== usuario.vendedorId) {
    notFound();
  }
  if (!linha.faseLibera) notFound();

  const ficha = await db.query.orcamentoInstalacao.findFirst({
    where: eq(orcamentoInstalacao.orcamentoId, orcamentoId),
  });
  const linhasFicha = await db
    .select()
    .from(instalacaoItens)
    .where(eq(instalacaoItens.orcamentoId, orcamentoId))
    .orderBy(asc(instalacaoItens.ordem));

  const paraInput = (d: Date | null | undefined) =>
    d ? format(d, "yyyy-MM-dd") : "";
  const dados: DadosInstalacao = {
    responsavel: ficha?.responsavel ?? "",
    calha: ficha?.calha ?? "",
    tipoEscada: ficha?.tipoEscada ?? "",
    condEstacionamento: ficha?.condEstacionamento ?? "",
    prevEntrega: paraInput(ficha?.prevEntrega),
    dataEntrega: paraInput(ficha?.dataEntrega),
  };
  const linhas: LinhaInstalacao[] = linhasFicha.map((l) => ({
    qtde: l.qtde ?? "",
    produto: l.produto ?? "",
    estrutura: l.estrutura ?? "",
    revestimento: l.revestimento ?? "",
    rufo: l.rufo ?? "",
    babado: l.babado ?? "",
    vies: l.vies ?? "",
  }));

  const endereco = enderecoCompleto(linha.cliente);
  const pdfUrl = `/orcamentos/${linha.orc.id}/ficha/pdf`;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link
          href={`/orcamentos/${linha.orc.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar ao orçamento {linha.orc.numero}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Ficha de Instalação
        </h1>
        <p className="text-sm text-muted-foreground">
          {linha.cliente.nome} · {linha.faseNome} · uso interno da equipe, o
          cliente não recebe esta ficha.
        </p>
      </div>

      <AcoesFicha
        pdfUrl={pdfUrl}
        nomeArquivo={`ficha-instalacao-${linha.orc.numero}.pdf`}
      />

      {/* Dados que vêm do cadastro — não se digita aqui */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Cliente: </span>
            {linha.cliente.nome}
          </p>
          <p>
            <span className="text-muted-foreground">Telefone: </span>
            {linha.cliente.telefone}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Endereço: </span>
            {endereco || "—"}
          </p>
          {linha.cliente.email && (
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">E-mail: </span>
              {linha.cliente.email}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da instalação</CardTitle>
          <p className="text-sm text-muted-foreground">
            Preencha e salve. Depois use Imprimir ou Baixar PDF acima.
          </p>
        </CardHeader>
        <CardContent>
          <InstalacaoForm
            orcamentoId={linha.orc.id}
            dados={dados}
            linhas={linhas}
          />
        </CardContent>
      </Card>
    </div>
  );
}
