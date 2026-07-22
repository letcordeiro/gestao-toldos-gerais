import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { tokenValido } from "./actions";
import { FormRedefinir } from "./form-redefinir";

export default async function RedefinirSenhaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valido = await tokenValido(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image
            src="/logo.png"
            alt="Toldos Gerais"
            width={147}
            height={80}
            priority
            className="mx-auto mb-2"
          />
          <CardTitle>{valido ? "Criar nova senha" : "Link expirado"}</CardTitle>
          <CardDescription>
            {valido
              ? "Escolha a senha que você vai usar para entrar no sistema."
              : "Este link já foi usado ou passou de 1 hora."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {valido ? (
            <FormRedefinir token={token} />
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full"
                nativeButton={false}
                render={<Link href="/esqueci-senha" />}
              >
                Pedir um novo link
              </Button>
              <p className="text-center text-sm">
                <Link
                  href="/login"
                  className="text-muted-foreground hover:underline"
                >
                  Voltar para o login
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
