import Image from "next/image";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, clientes, pesquisas } from "@/db/schema";
import { EMPRESA } from "@/lib/empresa";
import { FormPesquisa } from "./form-pesquisa";

export const metadata = {
  title: "Como foi o nosso atendimento?",
  robots: { index: false },
};

// Página PÚBLICA (sem sessão) — a trava é o token do link.
export default async function PesquisaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [linha] = await db
    .select({
      pesquisa: pesquisas,
      clienteNome: clientes.nome,
    })
    .from(pesquisas)
    .innerJoin(atendimentos, eq(pesquisas.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(eq(pesquisas.token, token));

  if (!linha) notFound();

  const primeiroNome = linha.clienteNome.split(" ")[0];

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt={EMPRESA.razaoSocial}
            width={110}
            height={59}
            priority
          />
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">
            Oi, {primeiroNome}!
          </h1>
          <p className="mb-5 text-sm text-muted-foreground">
            Terminamos o seu serviço e queríamos saber como foi. É rápido —
            uma nota e, se quiser, um comentário.
          </p>

          <FormPesquisa
            token={token}
            notaInicial={linha.pesquisa.nota}
            comentarioInicial={linha.pesquisa.comentario}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {EMPRESA.razaoSocial} · {EMPRESA.site}
        </p>
      </div>
    </div>
  );
}
