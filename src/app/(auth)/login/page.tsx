"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { login, type LoginState } from "./actions";
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

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  );

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
          <CardTitle>Gestão Toldos Gerais</CardTitle>
          <CardDescription>Entre para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="senha">Senha</Label>
              <InputSenha
                id="senha"
                name="senha"
                autoComplete="current-password"
                required
              />
            </div>
            {state.erro && (
              <p className="text-sm text-destructive">{state.erro}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Entrando…" : "Entrar"}
            </Button>
            <p className="text-center text-sm">
              <Link
                href="/esqueci-senha"
                className="text-muted-foreground hover:underline"
              >
                Esqueci minha senha
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
