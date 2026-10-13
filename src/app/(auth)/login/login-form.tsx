"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { entrarDemo, login, type LoginState } from "./actions";
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

type ContaDemo = { papel: string; nome: string; resumo: string; rotulo: string };

export function LoginForm({ contasDemo }: { contasDemo: ContaDemo[] | null }) {
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
          <CardDescription>
            {contasDemo
              ? "Demonstração com dados fictícios. Escolha um perfil para entrar."
              : "Entre para acessar o sistema"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {contasDemo && (
            <div className="space-y-2">
              {contasDemo.map((c) => (
                <form key={c.papel} action={entrarDemo}>
                  <input type="hidden" name="papel" value={c.papel} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left hover:border-primary hover:bg-primary/5 focus-visible:border-primary focus-visible:outline-none"
                  >
                    <span>
                      <span className="block text-sm font-medium">Entrar como {c.rotulo}</span>
                      <span className="block text-xs text-muted-foreground">
                        {c.nome} · {c.resumo}
                      </span>
                    </span>
                    <span aria-hidden className="text-primary">→</span>
                  </button>
                </form>
              ))}
              <p className="pt-1 text-center text-xs text-muted-foreground">
                Tudo o que for feito aqui é apagado na próxima atualização.
              </p>
            </div>
          )}
          {!contasDemo && (
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
          )}
        </CardContent>
      </Card>
    </main>
  );
}
