import Image from "next/image";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";
import { VisualizadorPdf } from "./visualizador-pdf";

// Página PÚBLICA de visualização da proposta (link enviado ao cliente).
export default async function PropostaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [linha] = await db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      clienteNome: clientes.nome,
      vendedorNome: vendedores.nome,
      vendedorTelefone: vendedores.telefone,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .where(eq(orcamentos.publicToken, token));

  if (!linha) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm space-y-2 text-center">
          <p className="text-lg font-semibold">
            Proposta não encontrada.
          </p>
          <p className="text-sm text-muted-foreground">
            O link pode estar incorreto. Fale com a gente pelo WhatsApp{" "}
            {EMPRESA.whatsapp} ou pelo fixo {EMPRESA.telefoneFixo}.
          </p>
        </div>
      </main>
    );
  }

  const contato = linha.vendedorTelefone
    ? linkWhatsApp(
        linha.vendedorTelefone,
        `Olá! Tenho dúvidas sobre a proposta ${linha.numero}.`
      )
    : linkWhatsApp(EMPRESA.whatsapp);

  const pdfUrl = `/proposta/${token}/pdf`;

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Barra fina fixa: logo + baixar */}
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
            href={pdfUrl}
            download={`proposta-${linha.numero}.pdf`}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Baixar PDF
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4">
        <div className="mb-3 text-center">
          <h1 className="text-lg font-semibold tracking-tight">
            Proposta Técnica Comercial Nº {linha.numero}
          </h1>
          <p className="text-sm text-muted-foreground">{linha.clienteNome}</p>
        </div>

        <VisualizadorPdf
          url={pdfUrl}
          downloadName={`proposta-${linha.numero}.pdf`}
        />

        <p className="pt-5 text-center text-sm text-muted-foreground">
          {linha.vendedorNome ? (
            <>
              Atendimento com <strong>{linha.vendedorNome}</strong>.{" "}
            </>
          ) : null}
          Dúvidas?{" "}
          <a
            href={contato}
            target="_blank"
            rel="noopener"
            className="font-medium text-primary hover:underline"
          >
            Fale no WhatsApp
          </a>
          .
        </p>
        <p className="pt-3 text-center text-xs text-muted-foreground">
          {EMPRESA.razaoSocial} · {EMPRESA.site}
        </p>
      </div>
    </main>
  );
}
