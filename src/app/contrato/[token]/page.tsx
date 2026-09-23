import Image from "next/image";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contratos } from "@/db/schema";
import { EMPRESA, EMPRESA_CONTRATO } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";
import { carregarDadosContrato } from "@/lib/gerar-contrato";
import { ContratoPreview } from "@/components/shared/contrato-preview";
import { ImprimirContrato } from "./imprimir-contrato";

export const metadata = { title: "Contrato" };

// Página PÚBLICA do contrato — abre em qualquer navegador (inclusive o do
// WhatsApp) e oferece o PDF. Mesmo padrão da proposta pública.
export default async function ContratoPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const carregado = await carregarDadosContrato(
    eq(contratos.publicToken, token)
  );

  if (!carregado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm space-y-2 text-center">
          <p className="text-lg font-semibold">Contrato não encontrado.</p>
          <p className="text-sm text-muted-foreground">
            O link pode estar incorreto. Fale com a gente pelo WhatsApp{" "}
            {EMPRESA.whatsapp} ou pelo fixo {EMPRESA.telefoneFixo}.
          </p>
        </div>
      </main>
    );
  }

  const pdfUrl = `/contrato/${token}/pdf`;

  // Contrato cancelado (ou trocado por versão nova) continua com link vivo — o
  // cliente pode ter guardado a mensagem. Sem aviso, ele abria um documento
  // que não vale mais como se valesse.
  const cancelado = carregado.dados.status === "cancelado";
  let substituido = false;
  if (cancelado) {
    const [atual] = await db
      .select({ id: contratos.id })
      .from(contratos)
      .where(eq(contratos.publicToken, token));
    const filho = atual
      ? await db.query.contratos.findFirst({
          where: eq(contratos.contratoPaiId, atual.id),
          columns: { id: true },
        })
      : undefined;
    substituido = !!filho;
  }

  return (
    <main className="min-h-screen bg-muted/30 pb-10">
      <div className="sticky top-0 z-10 border-b bg-card print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          {/* Logo do emitente do contrato (Alvorada). O WhatsApp abaixo
              continua sendo o do atendimento da Toldos Gerais — é por lá que o
              cliente fala com o João. */}
          <Image
            src={`/${EMPRESA_CONTRATO.logoArquivo}`}
            alt={EMPRESA_CONTRATO.nomeFantasia}
            width={80}
            height={47}
            priority
          />
          <div className="flex gap-2">
            <ImprimirContrato />
            {/* download no <a>: baixa o arquivo em vez de abrir o visualizador.
                Cancelado não oferece PDF: arquivo baixado circula sem a faixa
                que avisa que ele não vale mais. */}
            {!cancelado && (
              <a
                href={`${pdfUrl}?download=1`}
                download
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Baixar PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Fora da barra de propósito: a barra some na impressão, a faixa não —
          o papel impresso também precisa dizer que o contrato não vale. */}
      {cancelado && (
        // Na impressão o navegador costuma descartar o fundo: sem o
        // print:text-red-700 o texto branco sumiria no papel.
        <div className="border-b border-red-300 bg-red-600 text-white print:border-2 print:border-red-700 print:bg-transparent print:text-red-700">
          <div className="mx-auto max-w-3xl space-y-1 px-4 py-3 text-sm">
            <p className="font-semibold">
              {substituido
                ? "Este contrato foi substituído por uma versão mais nova e não vale mais."
                : "Este contrato foi cancelado e não vale mais."}
            </p>
            <p>
              {substituido
                ? "Peça o link da versão atual para a gente"
                : "Em caso de dúvida, fale com a gente"}{" "}
              pelo WhatsApp{" "}
              <a
                href={linkWhatsApp(
                  EMPRESA.whatsapp,
                  carregado.dados.numero
                    ? `Olá! Abri o contrato ${carregado.dados.numero} e ele aparece como cancelado.`
                    : "Olá! Abri um contrato que aparece como cancelado."
                )}
                target="_blank"
                rel="noopener"
                className="whitespace-nowrap font-semibold underline"
              >
                {EMPRESA.whatsapp}
              </a>{" "}
              ou pelo fixo{" "}
              <span className="whitespace-nowrap">{EMPRESA.telefoneFixo}</span>.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-5">
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <ContratoPreview dados={carregado.dados} />
        </div>

        <div className="mt-4 rounded-lg border bg-card p-4 text-center text-sm print:hidden">
          <p className="text-muted-foreground">
            Dúvidas sobre o contrato? Fale com a gente.
          </p>
          <a
            href={linkWhatsApp(
              EMPRESA.whatsapp,
              `Olá! Tenho dúvidas sobre o contrato ${
                carregado.dados.numero ?? ""
              }.`
            )}
            target="_blank"
            rel="noopener"
            className="mt-2 inline-flex h-9 items-center rounded-md border px-3 font-medium text-primary hover:bg-secondary"
          >
            WhatsApp {EMPRESA.whatsapp}
          </a>
        </div>
      </div>
    </main>
  );
}
