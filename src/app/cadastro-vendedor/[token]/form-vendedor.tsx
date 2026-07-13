"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputTelefone } from "@/components/shared/input-telefone";
import {
  cadastrarVendedor,
  type CadastroVendedorState,
} from "./actions";

export function FormVendedor({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<
    CadastroVendedorState,
    FormData
  >(cadastrarVendedor, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome e sobrenome *</Label>
        <Input id="nome" name="nome" placeholder="ex.: João Avelar" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="whatsapp">WhatsApp *</Label>
        <InputTelefone id="whatsapp" name="whatsapp" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="telefoneFixo">Telefone fixo (se tiver)</Label>
        <InputTelefone
          id="telefoneFixo"
          name="telefoneFixo"
          placeholder="(31)3333-3333"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail (será seu login) *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha *</Label>
          <Input
            id="senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            placeholder="mín. 6 caracteres"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmar">Confirmar senha *</Label>
          <Input
            id="confirmar"
            name="confirmar"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
      </div>
      {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Cadastrando…" : "Criar meu acesso"}
      </Button>
    </form>
  );
}
