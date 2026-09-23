import Image from "next/image";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, clientes, pesquisas } from "@/db/schema";
import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";
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

  // Nada de notFound(): a página 404 do sistema oferece "Ir para o início",
  // que cai no login — e o cliente não tem login. Aqui ele ganha um contato.
  if (!linha) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm space-y-2 text-center">
          <p className="text-lg font-semibold">Pesquisa não encontrada.</p>
          <p className="text-sm text-muted-foreground">
            O link pode estar incorreto. Fale com a gente pelo WhatsApp{" "}
            <a
              href={linkWhatsApp(EMPRESA.whatsapp)}
              target="_blank"
              rel="noopener"
              className="whitespace-nowrap font-medium text-primary underline"
            >
              {EMPRESA.whatsapp}
            </a>{" "}
            ou pelo fixo{" "}
            <span className="whitespace-nowrap">{EMPRESA.telefoneFixo}</span>.
          </p>
        </div>
      </main>
    );
  }

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
