import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ClipboardList,
  FileSignature,
  FileText,
  ListPlus,
  MessageCircle,
} from "lucide-react";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  contratos,
  fases,
  modelosToldo,
  orcamentoFotos,
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
import { podeComercial } from "@/lib/auth";
import { EMPRESA } from "@/lib/empresa";
import { MONTAGEM_COBERTURA, aosCuidados, textoValidade } from "@/lib/proposta";
import { exigirUsuario } from "@/lib/auth";
import { urlBase } from "@/lib/url";
import { mudarStatusOrcamento } from "../actions";
import { gerarContratoDoOrcamento } from "../../contratos/actions";
import { StatusSelect } from "./status-select";
import { FotosOrcamento } from "./fotos-orcamento";
import { AcoesOrcamento } from "./acoes-orcamento";
import { TarefaDialog } from "../../tarefas/tarefa-dialog";

export const metadata = { title: "Orçamento" };


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
      faseNome: fases.nome,
      faseLibera: fases.liberaInstalacao,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
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


  // Quem chega aqui já pode ver o orçamento; gestor e o vendedor dono editam.
  // Atendente só consulta — o comercial não é dela.
  const podeEditar =
    podeComercial(usuario.papel) &&
    (usuario.papel === "gestor" ||
      orcamento.orc.vendedorId === usuario.vendedorId);

  const { orc, cliente, vendedor } = orcamento;

  // A ficha de instalação passa a depender da FASE do atendimento (negócio
  // fechado), não mais do status do orçamento — assim existe um lugar só onde
  // se diz "o cliente fechou": o funil.
  const fichaLiberada = orcamento.faseLibera;

  // Link público da proposta — abre uma página (funciona no navegador do
  // WhatsApp) com botão para ver/baixar o PDF no navegador do celular.
  // Usa urlBase() (APP_URL fixa) para não depender do Host da requisição.
  const base = await urlBase();
  const linkProposta =
    orc.publicToken && base ? `${base}/proposta/${orc.publicToken}` : null;

  // Contrato vivo deste orçamento (se já foi gerado, o botão leva até ele).
  const contratoExistente = await db.query.contratos.findFirst({
    where: and(
      eq(contratos.orcamentoId, orc.id),
      ne(contratos.status, "cancelado")
    ),
    orderBy: desc(contratos.versao),
  });

  const modeloTexto = orcamento.modeloNome
    ? orc.formato
      ? `${orcamento.modeloNome} — Formato: ${rotuloFormato(orc.formato)}`
      : orcamento.modeloNome
    : null;

  // O que fazer agora, escrito em uma frase. A tela inteira gira em torno
  // disso — o resto das ações vai para o menu.
  // Um caso POR STATUS, e não uma escada que termina em "recusado". A escada
  // anterior tratava rascunho/enviado/aprovado e jogava os outros QUATRO no
  // "Orçamento recusado. Nada pendente por aqui." — inclusive `falha_envio`,
  // que é exatamente quando alguém precisa agir, e `agendado`, que é o estado
  // normal de quem acabou de clicar em "Finalizar e enviar automaticamente".
  const passoPorStatus: Record<
    typeof orc.status,
    { texto: string; acao: "enviar" | "fechar" | "produzir" | "nenhuma" }
  > = {
    rascunho: {
      texto: "Rascunho: revise os valores e mande a proposta ao cliente.",
      acao: "enviar",
    },
    agendado: {
      texto:
        "Na fila do envio automático. A proposta sai na próxima janela: " +
        "de segunda a sexta das 8h às 19h, e sábado das 8h às 12h.",
      acao: "nenhuma",
    },
    enviando: {
      texto: "Mandando a proposta ao cliente agora.",
      acao: "nenhuma",
    },
    falha_envio: {
      texto: orc.envioErro
        ? `O envio automático falhou: ${orc.envioErro}. Mande na mão ou tente de novo.`
        : "O envio automático falhou. Mande na mão ou tente de novo.",
      acao: "enviar",
    },
    enviado: {
      texto: fichaLiberada
        ? "Negócio fechado no funil — confirme o desfecho deste orçamento."
        : "Proposta com o cliente. Cobre o retorno ou registre a resposta no funil.",
      acao: "fechar",
    },
    aprovado: {
      texto: fichaLiberada
        ? "Aprovado: preencha a ficha de instalação e, se o cliente pedir, gere o contrato."
        : "Aprovado. Mova o atendimento para uma fase de negócio fechado para liberar ficha e contrato.",
      acao: fichaLiberada ? "produzir" : "nenhuma",
    },
    recusado: {
      texto: "Orçamento recusado. Nada pendente por aqui.",
      acao: "nenhuma",
    },
  };
  const proximoPasso = passoPorStatus[orc.status];

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
            · {orcamento.faseNome} ·{" "}
            {format(orc.criadoEm, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {podeEditar && (
            <StatusSelect orcamentoId={orc.id} status={orc.status} />
          )}
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/orcamentos/${orc.id}/imprimir`} target="_blank" />}
          >
            <FileText className="size-4" /> Ver proposta
          </Button>
          <AcoesOrcamento
            orcamentoId={orc.id}
            numero={orc.numero}
            status={orc.status}
            podeEditar={podeEditar}
            linkProposta={linkProposta}
          />
        </div>
      </div>

      {/* Próximo passo: uma linha que responde "e agora?" em vez de deixar o
          usuário escolher entre dez botões iguais. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-secondary/40 p-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Próximo passo
          </p>
          <p className="text-sm">{proximoPasso.texto}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {proximoPasso.acao === "enviar" && (
            <>
              {podeEditar && (
                <form action={mudarStatusOrcamento.bind(null, orc.id, "agendado")}>
                  <Button type="submit">
                    Finalizar e enviar automaticamente
                  </Button>
                </form>
              )}
              {/* Saída manual: serve quando o envio automático falha e alguém
                  precisa mandar na mão. */}
              <Button
                variant="outline"
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
                <MessageCircle className="size-4" /> Mandar na mão
              </Button>
            </>
          )}
          {proximoPasso.acao === "fechar" && (
            <>
              <Button
                variant="outline"
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
                <MessageCircle className="size-4" /> Cobrar retorno
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={`/atendimentos/${orcamento.atendimentoId}`} />
                }
              >
                Marcar desfecho no funil
              </Button>
            </>
          )}
          {proximoPasso.acao === "produzir" && (
            <>
              <Button
                nativeButton={false}
                render={<Link href={`/orcamentos/${orc.id}/ficha`} />}
              >
                <ClipboardList className="size-4" /> Ficha de instalação
              </Button>
              {contratoExistente ? (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/contratos/${contratoExistente.id}`} />}
                >
                  <FileSignature className="size-4" /> Ver contrato
                </Button>
              ) : (
                podeEditar && (
                  <form action={gerarContratoDoOrcamento.bind(null, orc.id)}>
                    <Button type="submit" variant="outline">
                      <FileSignature className="size-4" /> Gerar contrato
                    </Button>
                  </form>
                )
              )}
            </>
          )}
          <TarefaDialog
            atendimentoId={orcamento.atendimentoId}
            orcamentoId={orc.id}
            trigger={
              <Button variant="ghost" size="sm">
                <ListPlus className="size-4" /> Criar tarefa
              </Button>
            }
          />
        </div>
      </div>

      {orc.observacoesInternas && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Anotação interna — o cliente não vê
          </p>
          <p className="mt-1 whitespace-pre-line text-sm">
            {orc.observacoesInternas}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Proposta Técnica Comercial
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Belo Horizonte,{" "}
            {format(orc.criadoEm, "d 'de' MMMM 'de' yyyy", { locale: ptBR })} ·
            A/c de {aosCuidados(orc.aosCuidadosDe, cliente.nome)}{" "}
            {cliente.telefone}
            {cliente.endereco ? ` · ${cliente.endereco}` : ""}
            {cliente.cidade ? ` — ${cliente.cidade}` : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {orc.introducao && (
            <p className="text-justify">{orc.introducao}</p>
          )}
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
          {textoValidade(orc.validadeDias, orc.enviadoEm ?? orc.criadoEm) && (
            <p className="font-semibold text-primary">
              {textoValidade(orc.validadeDias, orc.enviadoEm ?? orc.criadoEm)}
            </p>
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

    </div>
  );
}
