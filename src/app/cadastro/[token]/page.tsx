import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { vendedores } from "@/db/schema";
import { FormCadastro } from "../form-cadastro";
import { EMPRESA } from "@/lib/empresa";

export default async function CadastroTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // O token é o link exclusivo de um vendedor: o lead nasce atribuído a ele.
  const vendedor = await db.query.vendedores.findFirst({
    where: and(eq(vendedores.linkToken, token), eq(vendedores.ativo, true)),
  });

  if (!vendedor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm space-y-2 text-center">
          <p className="text-lg font-semibold">
            Este link de cadastro não é mais válido.
          </p>
          <p className="text-sm text-muted-foreground">
            Fale com a gente pelo WhatsApp {EMPRESA.whatsapp} ou pelo fixo{" "}
            {EMPRESA.telefoneFixo}.
          </p>
        </div>
      </main>
    );
  }

  return <FormCadastro token={token} vendedorNome={vendedor.nome} />;
}
