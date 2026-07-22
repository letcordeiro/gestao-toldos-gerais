"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { InputSenha } from "@/components/shared/input-senha";
import { Label } from "@/components/ui/label";
import { redefinirComToken, type RedefinirState } from "./actions";

export function FormRedefinir({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<
    RedefinirState,
    FormData
  >(redefinirComToken, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="novaSenha">Nova senha</Label>
        <InputSenha
          id="novaSenha"
          name="novaSenha"
          autoComplete="new-password"
          placeholder="mín. 6 caracteres"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmar">Confirmar nova senha</Label>
        <InputSenha
          id="confirmar"
          name="confirmar"
          autoComplete="new-password"
          required
        />
      </div>
      {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
