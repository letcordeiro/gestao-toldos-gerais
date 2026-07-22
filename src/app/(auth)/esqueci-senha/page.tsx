"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { pedirLinkDeSenha, type RecuperarState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EsqueciSenhaPage() {
  const [state, formAction, pending] = useActionState<
    RecuperarState,
    FormData
  >(pedirLinkDeSenha, {});

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
          {state.ok ? (
            <CardTitle>Verifique seu e-mail</CardTitle>
          ) : (
            <>
              <CardTitle>Recuperar senha</CardTitle>
              <CardDescription>
                Informe seu e-mail e enviamos um link para você criar uma nova
                senha.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {state.ok ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MailCheck className="size-6" />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Se esse e-mail estiver cadastrado, o link de redefinição já está
                a caminho. Ele vale por <strong>1 hora</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Não chegou? Confira a caixa de spam.
              </p>
              <Button
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Voltar para o login
              </Button>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              {state.erro && (
                <p className="text-sm text-destructive">{state.erro}</p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Enviando…" : "Enviar link de redefinição"}
              </Button>
              <p className="text-center text-sm">
                <Link
                  href="/login"
                  className="text-muted-foreground hover:underline"
                >
                  Voltar para o login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
