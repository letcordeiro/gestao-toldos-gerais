import Image from "next/image";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  modelosToldo,
  orcamentoFotos,
  orcamentoItens,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";
import { rotuloEstrutura, rotuloFormato } from "@/lib/labels";
import { MONTAGEM_COBERTURA } from "@/lib/proposta";
import { formatarValorItem } from "@/lib/format";
import { enderecoCompleto } from "@/lib/endereco";

function Secao({
  titulo,
  texto,
}: {
  titulo: string;
  texto: string | null;
}) {
  if (!texto) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide text-primary">
        {titulo}
      </h3>
      <p className="whitespace-pre-line text-sm">{texto}</p>
    </div>
  );
}

// Página PÚBLICA da proposta — renderiza como HTML (abre em qualquer navegador,
// inclusive o interno do WhatsApp) + botão para baixar o PDF.
export default async function PropostaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [linha] = await db
    .select({
      orc: orcamentos,
      cliente: clientes,
      modeloNome: modelosToldo.nome,
      vendedor: vendedores,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(modelosToldo, eq(orcamentos.modeloId, modelosToldo.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .where(eq(orcamentos.publicToken, token));

  if (!linha) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm space-y-2 text-center">
          <p className="text-lg font-semibold">Proposta não encontrada.</p>
          <p className="text-sm text-muted-foreground">
            O link pode estar incorreto. Fale com a gente pelo WhatsApp{" "}
            {EMPRESA.whatsapp} ou pelo fixo {EMPRESA.telefoneFixo}.
          </p>
        </div>
      </main>
    );
  }

  const { orc, cliente, vendedor } = linha;

  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, orc.id))
    .orderBy(asc(orcamentoItens.ordem));

  const fotos = await db
    .select({ id: orcamentoFotos.id })
    .from(orcamentoFotos)
    .where(eq(orcamentoFotos.orcamentoId, orc.id))
    .orderBy(asc(orcamentoFotos.ordem));

  const enderecoCliente = enderecoCompleto(cliente);
  const modeloTexto = linha.modeloNome
    ? orc.formato
      ? `${linha.modeloNome} — Formato: ${rotuloFormato(orc.formato)}`
      : linha.modeloNome
    : null;

  const whatsappVendedor = vendedor?.whatsapp ?? vendedor?.telefone;
  const contato = whatsappVendedor
    ? linkWhatsApp(
        whatsappVendedor,
        `Olá! Tenho dúvidas sobre a proposta ${orc.numero}.`
      )
    : linkWhatsApp(EMPRESA.whatsapp);

  const pdfUrl = `/proposta/${token}/pdf`;

  return (
    <main className="min-h-screen bg-muted/30 pb-10">
      {/* Barra fixa: logo + baixar PDF */}
      <div className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5">
          <Image
            src="/logo.png"
            alt="Toldos Gerais"
            width={80}
            height={43}
            priority
          />
          <a
            href={pdfUrl}
            download={`proposta-${orc.numero}.pdf`}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Baixar PDF
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-3 border-b pb-3">
            <Image
              src="/logo.png"
              alt="Toldos Gerais"
              width={96}
              height={52}
            />
            <p className="text-right text-sm font-semibold text-primary">
              PROPOSTA TÉCNICA
              <br />
              COMERCIAL Nº {orc.numero}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Belo Horizonte,{" "}
            {format(orc.criadoEm, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.
          </p>

          <div className="border-b pb-3 text-sm">
            <p className="font-semibold">
              A/c de {cliente.nome} — {cliente.telefone}
            </p>
            {enderecoCliente ? (
              <p className="text-muted-foreground">{enderecoCliente}</p>
            ) : null}
          </div>

          <Secao titulo="MODELO" texto={modeloTexto} />
          <Secao titulo="DESCRIÇÃO DO MATERIAL" texto={orc.descricaoMaterial} />
          <Secao
            titulo="ESTRUTURA"
            texto={rotuloEstrutura(orc.tipoEstrutura) || null}
          />
          <Secao
            titulo="FIXAÇÃO E VEDAÇÃO DA ESTRUTURA"
            texto={orc.fixacaoVedacao}
          />
          <Secao titulo="MONTAGEM DA COBERTURA" texto={MONTAGEM_COBERTURA} />
          <Secao titulo="GARANTIA" texto={orc.garantiaTexto} />

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-primary">
              VALOR DO ORÇAMENTO
            </h3>
            <ul className="mt-1.5 space-y-1.5 text-sm">
              {itens.map((item) =>
                item.valorMin === null ? (
                  <li
                    key={item.id}
                    className="pt-1.5 font-medium text-muted-foreground"
                  >
                    {item.descricao}
                  </li>
                ) : (
                  <li key={item.id} className="flex items-baseline gap-2">
                    <span>{item.descricao}</span>
                    <span className="flex-1 border-b border-dotted border-muted-foreground/40" />
                    <span className="font-semibold">
                      {formatarValorItem(item.valorMin, item.valorMax)}
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Secao titulo="FORMA DE PAGAMENTO" texto={orc.formaPagamento} />
            <Secao titulo="PRAZO DE ENTREGA" texto={orc.prazoEntrega} />
          </div>

          {fotos.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-primary">
                FOTOS
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {fotos.map((f) => (
                  <a
                    key={f.id}
                    href={`/proposta/${token}/fotos/${f.id}`}
                    target="_blank"
                    rel="noopener"
                    className="overflow-hidden rounded-md border bg-secondary"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/proposta/${token}/fotos/${f.id}`}
                      alt="Foto da proposta"
                      className="h-40 w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {vendedor ? (
            <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
              <p className="text-xs font-semibold text-primary">
                VENDEDOR RESPONSÁVEL
              </p>
              <p className="font-semibold">{vendedor.nome}</p>
              <p className="text-muted-foreground">
                {[
                  vendedor.whatsapp ? `WhatsApp: ${vendedor.whatsapp}` : null,
                  vendedor.telefoneFixo ? `Fixo: ${vendedor.telefoneFixo}` : null,
                  vendedor.email,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <a
            href={contato}
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 w-full max-w-xs items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground hover:bg-primary/90"
          >
            Falar no WhatsApp
            {vendedor?.nome ? ` com ${vendedor.nome.split(" ")[0]}` : ""}
          </a>
          <p className="text-center text-xs text-muted-foreground">
            {EMPRESA.razaoSocial} · {EMPRESA.site}
          </p>
        </div>
      </div>
    </main>
  );
}
