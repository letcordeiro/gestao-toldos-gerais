import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tokensCadastro } from "@/db/schema";
import { FormCadastro } from "../form-cadastro";
import { EMPRESA } from "@/lib/empresa";

export default async function CadastroTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const registro = await db.query.tokensCadastro.findFirst({
    where: eq(tokensCadastro.token, token),
  });

  const valido =
    registro && registro.usadoEm === null && registro.expiraEm >= new Date();

  if (!valido) {
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

  return <FormCadastro token={token} />;
}
