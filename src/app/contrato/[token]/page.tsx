import Image from "next/image";
import { eq } from "drizzle-orm";
import { contratos } from "@/db/schema";
import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";
import { carregarDadosContrato } from "@/lib/gerar-contrato";
import { ContratoPreview } from "@/components/shared/contrato-preview";

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

  return (
    <main className="min-h-screen bg-muted/30 pb-10">
      <div className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <Image
            src="/logo.png"
            alt="Toldos Gerais"
            width={80}
            height={43}
            priority
          />
          <a
            href={`${pdfUrl}?download=1`}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Baixar PDF
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-5">
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <ContratoPreview dados={carregado.dados} minuta={carregado.minuta} />
        </div>

        <div className="mt-4 rounded-lg border bg-card p-4 text-center text-sm">
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
