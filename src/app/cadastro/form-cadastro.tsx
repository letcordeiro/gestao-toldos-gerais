"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CamposEndereco } from "@/components/shared/campos-endereco";
import {
  enviarAutoCadastro,
  type CadastroPublicoState,
} from "./actions";

export function FormCadastro({
  token,
  vendedorNome,
}: {
  token?: string;
  vendedorNome?: string;
}) {
  const [state, formAction, pending] = useActionState<
    CadastroPublicoState,
    FormData
  >(enviarAutoCadastro, {});

  return (
    <main className="flex min-h-screen items-start justify-center bg-background p-4 pt-10">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Image
            src="/logo.png"
            alt="Toldos Gerais"
            width={147}
            height={80}
            priority
            className="mx-auto mb-2"
          />
          {state.ok ? null : (
            <>
              <CardTitle>Solicite seu orçamento</CardTitle>
              <CardDescription>
                {vendedorNome
                  ? `Atendimento com ${vendedorNome}. Preencha seus dados e entraremos em contato.`
                  : "Preencha seus dados e entraremos em contato."}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {state.ok ? (
            <div className="space-y-2 py-6 text-center">
              <p className="text-lg font-semibold text-primary">
                Recebemos seus dados!
              </p>
              <p className="text-sm text-muted-foreground">
                Nossa equipe vai entrar em contato em breve. Obrigado pela
                confiança — Toldos Gerais.
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-3">
              {token && <input type="hidden" name="token" value={token} />}
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" name="nome" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone / WhatsApp *</Label>
                <Input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  required
                  placeholder="(31) 9…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <CamposEndereco />
              <div className="space-y-1.5">
                <Label htmlFor="descricao">Descreva o que precisa</Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  rows={3}
                  placeholder="ex.: cobertura para área de 4x6m…"
                />
              </div>
              {state.erro && (
                <p className="text-sm text-destructive">{state.erro}</p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Enviando…" : "Enviar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
