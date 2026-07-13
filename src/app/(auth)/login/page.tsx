"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { login, type LoginState } from "./actions";
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

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  );
  const [verSenha, setVerSenha] = useState(false);

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
              <div className="relative">
                <Input
                  id="senha"
                  name="senha"
                  type={verSenha ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setVerSenha((v) => !v)}
                  aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                  title={verSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {verSenha ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
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
