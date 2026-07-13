"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { redefinirSenha, type RecuperarState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputSenha } from "@/components/shared/input-senha";
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
  >(redefinirSenha, {});

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
            <CardTitle>Senha redefinida</CardTitle>
          ) : (
            <>
              <CardTitle>Recuperar senha</CardTitle>
              <CardDescription>
                Informe seu e-mail, o código de recuperação e a nova senha.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {state.ok ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Pronto! Sua senha foi alterada. Já pode entrar com a nova senha.
              </p>
              <Button className="w-full" render={<Link href="/login" />}>
                Ir para o login
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
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo">Código de recuperação</Label>
                <Input
                  id="codigo"
                  name="codigo"
                  placeholder="ex.: TG-XXXXXXXX"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <InputSenha
                  id="novaSenha"
                  name="novaSenha"
                  autoComplete="new-password"
                  required
                />
              </div>
              {state.erro && (
                <p className="text-sm text-destructive">{state.erro}</p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Salvando…" : "Redefinir senha"}
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
