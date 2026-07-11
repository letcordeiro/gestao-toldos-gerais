import Image from "next/image";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  orcamentoFotos,
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

  const fotos = await db
    .select({ id: orcamentoFotos.id })
    .from(orcamentoFotos)
    .where(eq(orcamentoFotos.orcamentoId, linha.id))
    .orderBy(asc(orcamentoFotos.ordem));

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
          Sua proposta está pronta. Toque no botão abaixo para abrir o
          documento em PDF.
        </div>

        {fotos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {fotos.map((f) => (
              <a
                key={f.id}
                href={`/proposta/${token}/fotos/${f.id}`}
                target="_blank"
                rel="noopener"
                className="aspect-square overflow-hidden rounded-md border bg-secondary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/proposta/${token}/fotos/${f.id}`}
                  alt="Foto da proposta"
                  className="h-full w-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full text-base"
            nativeButton={false}
            render={
              <a
                href={`/proposta/${token}/pdf`}
                target="_blank"
                rel="noopener"
              />
            }
          >
            📄 Ver proposta em PDF
          </Button>
          <p className="text-xs text-muted-foreground">
            Se não abrir,{" "}
            <a
              href={`/proposta/${token}/pdf`}
              download={`proposta-${linha.numero}.pdf`}
              className="font-medium text-primary underline"
            >
              baixe o PDF aqui
            </a>
            .
          </p>
        </div>
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
