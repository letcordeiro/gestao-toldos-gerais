import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  instalacaoItens,
  modelosToldo,
  orcamentoFotos,
  orcamentoInstalacao,
  orcamentoItens,
  orcamentos,
  vendedores,
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
import { rotuloEstrutura, rotuloFormato } from "@/lib/labels";
import { EMPRESA } from "@/lib/empresa";
import { MONTAGEM_COBERTURA } from "@/lib/proposta";
import { exigirUsuario } from "@/lib/auth";
import { urlBase } from "@/lib/url";
import { duplicarOrcamento } from "../actions";
import { StatusSelect } from "./status-select";
import { FotosOrcamento } from "./fotos-orcamento";
import {
  InstalacaoForm,
  type DadosInstalacao,
  type LinhaInstalacao,
} from "./instalacao-form";
import { ExcluirOrcamentoButton } from "./excluir-orcamento-button";

function linkWhatsApp(
  telefone: string,
  nome: string,
  numero: string,
  linkProposta: string | null
): string {
  const digitos = telefone.replace(/\D/g, "");
  const completo = digitos.startsWith("55") ? digitos : `55${digitos}`;
  const primeiroNome = nome.split(" ")[0];
  const mensagem =
    `Olá, ${primeiroNome}! Segue a Proposta Técnica Comercial nº ${numero} da Toldos Gerais.` +
    (linkProposta
      ? `\n\nO link abaixo abre a visualização do seu orçamento. Se preferir, é só tocar em "Baixar PDF" na própria página:\n${linkProposta}`
      : "") +
    `\n\nQualquer dúvida, estamos à disposição. ${EMPRESA.site}`;
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

  const usuario = await exigirUsuario();

  const [orcamento] = await db
    .select({
      orc: orcamentos,
      atendimentoId: atendimentos.id,
      cliente: clientes,
      modeloNome: modelosToldo.nome,
      vendedor: vendedores,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(modelosToldo, eq(orcamentos.modeloId, modelosToldo.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .where(eq(orcamentos.id, orcamentoId));

  if (!orcamento) notFound();

  // Vendedor só acessa os próprios orçamentos.
  if (
    usuario.papel === "vendedor" &&
    orcamento.orc.vendedorId !== usuario.vendedorId
  ) {
    notFound();
  }

  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, orcamentoId))
    .orderBy(asc(orcamentoItens.ordem));

  const fotos = await db
    .select({ id: orcamentoFotos.id, arquivo: orcamentoFotos.arquivo })
    .from(orcamentoFotos)
    .where(eq(orcamentoFotos.orcamentoId, orcamentoId))
    .orderBy(asc(orcamentoFotos.ordem));

  // Ficha de instalação (só usada quando o orçamento está aprovado).
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
  const dadosInstalacao: DadosInstalacao = {
    responsavel: ficha?.responsavel ?? "",
    observacoes: ficha?.observacoes ?? "",
    calha: ficha?.calha ?? "",
    tipoEscada: ficha?.tipoEscada ?? "",
    condEstacionamento: ficha?.condEstacionamento ?? "",
    horario: ficha?.horario ?? "",
    prevEntrega: paraInput(ficha?.prevEntrega),
    dataEntrega: paraInput(ficha?.dataEntrega),
  };
  const linhasInstalacao: LinhaInstalacao[] = linhasFicha.map((l) => ({
    qtde: l.qtde ?? "",
    produto: l.produto ?? "",
    estrutura: l.estrutura ?? "",
    revestimento: l.revestimento ?? "",
    rufo: l.rufo ?? "",
    babado: l.babado ?? "",
    vies: l.vies ?? "",
  }));

  // Quem chega aqui já pode ver o orçamento; gestor e o vendedor dono editam.
  const podeEditar =
    usuario.papel === "gestor" ||
    orcamento.orc.vendedorId === usuario.vendedorId;

  const { orc, cliente, vendedor } = orcamento;

  // Link público da proposta — abre uma página (funciona no navegador do
  // WhatsApp) com botão para ver/baixar o PDF no navegador do celular.
  // Usa urlBase() (APP_URL fixa) para não depender do Host da requisição.
  const base = await urlBase();
  const linkProposta =
    orc.publicToken && base ? `${base}/proposta/${orc.publicToken}` : null;

  const modeloTexto = orcamento.modeloNome
    ? orc.formato
      ? `${orcamento.modeloNome} — Formato: ${rotuloFormato(orc.formato)}`
      : orcamento.modeloNome
    : null;

  const secoes: Array<{ titulo: string; texto: string | null }> = [
    { titulo: "MODELO", texto: modeloTexto },
    { titulo: "DESCRIÇÃO DO MATERIAL", texto: orc.descricaoMaterial },
    { titulo: "ESTRUTURA", texto: rotuloEstrutura(orc.tipoEstrutura) || null },
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
          <form action={duplicarOrcamento}>
            <input type="hidden" name="orcamentoId" value={orc.id} />
            <Button type="submit" variant="outline">
              Duplicar
            </Button>
          </form>
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
          {linkProposta && (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a href={linkProposta} target="_blank" rel="noopener" />
              }
            >
              Link do cliente
            </Button>
          )}
          <Button
            className="w-full sm:w-auto"
            nativeButton={false}
            render={
              <a
                href={linkWhatsApp(
                  cliente.telefone,
                  cliente.nome,
                  orc.numero,
                  linkProposta
                )}
                target="_blank"
                rel="noopener"
              />
            }
          >
            Enviar no WhatsApp
          </Button>
          {orc.status === "rascunho" && podeEditar && (
            <ExcluirOrcamentoButton orcamentoId={orc.id} numero={orc.numero} />
          )}
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

          {vendedor && (
            <div className="rounded-lg border bg-secondary/40 p-3">
              <p className="text-xs font-semibold text-primary">
                VENDEDOR RESPONSÁVEL
              </p>
              <p className="font-medium">{vendedor.nome}</p>
              <div className="text-sm text-muted-foreground">
                {(vendedor.whatsapp ?? vendedor.telefone) && (
                  <p>
                    WhatsApp: {vendedor.whatsapp ?? vendedor.telefone}
                  </p>
                )}
                {vendedor.telefoneFixo && (
                  <p>Telefone fixo: {vendedor.telefoneFixo}</p>
                )}
                {vendedor.email && <p>E-mail: {vendedor.email}</p>}
              </div>
            </div>
          )}

          <Separator />
          <p className="text-xs text-muted-foreground">
            {EMPRESA.razaoSocial} — {EMPRESA.site} / {EMPRESA.emailVendas} —{" "}
            {EMPRESA.endereco} – {EMPRESA.telefoneFixo}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fotos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aparecem no PDF e no link que o cliente recebe.
          </p>
        </CardHeader>
        <CardContent>
          <FotosOrcamento
            orcamentoId={orc.id}
            fotos={fotos}
            podeEditar={podeEditar}
          />
        </CardContent>
      </Card>

      {/* Ficha de instalação: ordem de serviço INTERNA, só depois que o
          cliente fecha (orçamento aprovado). Não vai no link do cliente. */}
      {orc.status === "aprovado" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ficha de instalação</CardTitle>
            <p className="text-sm text-muted-foreground">
              Uso interno da equipe — sai como página 2 do PDF que você imprime.
              O cliente não recebe esta ficha.
            </p>
          </CardHeader>
          <CardContent>
            <InstalacaoForm
              orcamentoId={orc.id}
              dados={dadosInstalacao}
              linhas={linhasInstalacao}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
