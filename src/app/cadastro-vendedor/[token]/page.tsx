import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EMPRESA } from "@/lib/empresa";
import { FormVendedor } from "./form-vendedor";

// Página PÚBLICA de auto-cadastro de vendedor (link enviado pelo gestor).
export default async function CadastroVendedorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valido =
    Boolean(process.env.VENDEDOR_SIGNUP_TOKEN) &&
    token === process.env.VENDEDOR_SIGNUP_TOKEN;

  if (!valido) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm space-y-2 text-center">
          <p className="text-lg font-semibold">
            Link de cadastro não é mais válido.
          </p>
          <p className="text-sm text-muted-foreground">
            Peça um novo link ao gestor.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-background p-4 pt-10">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Image
            src="/logo.png"
            alt="Toldos Gerais"
            width={140}
            height={76}
            priority
            className="mx-auto mb-2"
          />
          <CardTitle>Cadastro de vendedor</CardTitle>
          <CardDescription>
            Crie seu acesso ao sistema da {EMPRESA.razaoSocial}. Seus dados
            aparecem nos orçamentos que você enviar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormVendedor token={token} />
        </CardContent>
      </Card>
    </main>
  );
}
