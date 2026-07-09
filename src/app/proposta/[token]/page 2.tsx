import Image from "next/image";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { Button } from "@/components/ui/button";
import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";

// Página PÚBLICA de visualização da proposta (link enviado ao cliente).
export default async function PropostaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [linha] = await db
    .select({
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <Image
          src="/logo.png"
          alt="Toldos Gerais"
          width={160}
          height={87}
          priority
          className="mx-auto"
        />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Proposta Técnica Comercial
          </h1>
          <p className="text-muted-foreground">
            Nº {linha.numero} · {linha.clienteNome}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
          Sua proposta está pronta. Toque no botão abaixo para ver ou baixar o
          documento em PDF.
        </div>
        <Button
          size="lg"
          className="w-full"
          nativeButton={false}
          render={
            <a href={`/proposta/${token}/pdf`} target="_blank" rel="noopener" />
          }
        >
          Ver / baixar proposta (PDF)
        </Button>
        <p className="text-sm text-muted-foreground">
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
        <p className="pt-4 text-xs text-muted-foreground">
          {EMPRESA.razaoSocial} · {EMPRESA.site}
        </p>
      </div>
    </main>
  );
}
