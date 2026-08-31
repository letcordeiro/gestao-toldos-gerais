import Image from "next/image";
import Link from "next/link";
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
import { conexaoDoVendedor, googleConfigurado } from "@/lib/google-agenda";
import { AgendaGoogle } from "./agenda-google";
import { PerfilForm } from "./perfil-form";
import { SegurancaForm } from "./seguranca-form";

export const metadata = { title: "Meu perfil" };


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

  const conexaoAgenda = await conexaoDoVendedor(usuario.vendedorId);

  return (
    <main className="flex min-h-screen items-start justify-center bg-background p-4 pt-10">
      <div className="w-full max-w-lg space-y-4">
        {!primeiraVez && (
          <Link
            href="/atendimentos"
            className="inline-block text-sm text-muted-foreground hover:underline"
          >
            ← Voltar para o sistema
          </Link>
        )}
        <Card>
          <CardHeader className="items-center text-center">
            <Image
              src="/logo.png"
              alt="Toldos Gerais"
              width={120}
              height={65}
              priority
              className="mx-auto mb-2"
            />
            <CardTitle>
              {/* h1 de verdade: era a única tela do sistema sem título principal */}
              <h1 className="text-inherit">Seus dados de vendedor</h1>
            </CardTitle>
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
          </CardContent>
        </Card>

        {/* Some no primeiro acesso: quem ainda não completou o cadastro tem uma
            coisa só para fazer aqui, e agenda não é ela. */}
        {!primeiraVez && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Agenda</CardTitle>
              <CardDescription>
                Seus compromissos entram no cálculo de horário livre das visitas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgendaGoogle
                disponivel={googleConfigurado()}
                conexao={
                  conexaoAgenda && {
                    googleEmail: conexaoAgenda.googleEmail,
                    conectadoEm: conexaoAgenda.conectadoEm.toLocaleDateString("pt-BR"),
                    ultimoErro: conexaoAgenda.ultimoErro,
                  }
                }
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Segurança</CardTitle>
            <CardDescription>
              Altere sua senha de acesso ao sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SegurancaForm />
          </CardContent>
        </Card>

        <form action={sair} className="text-center">
          <Button variant="ghost" size="sm" type="submit">
            Sair
          </Button>
        </form>
      </div>
    </main>
  );
}
