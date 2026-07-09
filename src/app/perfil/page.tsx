import Image from "next/image";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vendedores } from "@/db/schema";
import { exigirUsuario, encerrarSessao } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PerfilForm } from "./perfil-form";

async function sair() {
  "use server";
  await encerrarSessao();
  redirect("/login");
}

export default async function PerfilPage() {
  const usuario = await exigirUsuario();
  // Admin do env (sem cadastro de vendedor) não tem perfil a completar.
  if (usuario.vendedorId == null) redirect("/painel");

  const vendedor = await db.query.vendedores.findFirst({
    where: eq(vendedores.id, usuario.vendedorId),
  });
  if (!vendedor) redirect("/painel");

  const primeiraVez = !usuario.perfilCompleto;

  return (
    <main className="flex min-h-screen items-start justify-center bg-background p-4 pt-10">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Image
            src="/logo.png"
            alt="Toldos Gerais"
            width={120}
            height={65}
            priority
            className="mx-auto mb-2"
          />
          <CardTitle>Seus dados de vendedor</CardTitle>
          <CardDescription>
            {primeiraVez
              ? "Complete seu cadastro para começar a usar o sistema."
              : "Atualize seus dados de contato quando precisar."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerfilForm
            primeiraVez={primeiraVez}
            inicial={{
              nome: vendedor.nome ?? "",
              whatsapp: vendedor.whatsapp ?? "",
              telefoneFixo: vendedor.telefoneFixo ?? "",
              email: vendedor.email ?? "",
            }}
          />
          <form action={sair} className="mt-4 text-center">
            <Button variant="ghost" size="sm" type="submit">
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
