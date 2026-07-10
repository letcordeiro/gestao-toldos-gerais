"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputTelefone } from "@/components/shared/input-telefone";
import { salvarPerfil, type PerfilState } from "./actions";

export function PerfilForm({
  inicial,
  primeiraVez,
}: {
  inicial: {
    nome: string;
    whatsapp: string;
    telefoneFixo: string;
    email: string;
  };
  primeiraVez: boolean;
}) {
  const [state, formAction, pending] = useActionState<PerfilState, FormData>(
    salvarPerfil,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {primeiraVez && (
        <p className="rounded-md bg-secondary p-3 text-sm text-muted-foreground">
          Antes de começar, confirme seus dados de contato. Eles aparecem no
          orçamento que o cliente recebe.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome e sobrenome *</Label>
        <Input
          id="nome"
          name="nome"
          defaultValue={inicial.nome}
          placeholder="ex.: João Avelar"
          autoComplete="name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="whatsapp">WhatsApp *</Label>
        <InputTelefone
          id="whatsapp"
          name="whatsapp"
          defaultValue={inicial.whatsapp}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="telefoneFixo">Telefone fixo (se tiver)</Label>
        <InputTelefone
          id="telefoneFixo"
          name="telefoneFixo"
          defaultValue={inicial.telefoneFixo}
          placeholder="(31)3333-3333"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail (login)</Label>
        <Input id="email" value={inicial.email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          É o e-mail do seu login. Para trocar, fale com o gestor.
        </p>
      </div>
      {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando…" : "Salvar e continuar"}
      </Button>
    </form>
  );
}
