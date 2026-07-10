"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alterarSenha, type SenhaState } from "./actions";

export function SegurancaForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<SenhaState, FormData>(
    alterarSenha,
    {}
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Senha alterada com sucesso");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="senhaAtual">Senha atual</Label>
        <Input
          id="senhaAtual"
          name="senhaAtual"
          type="password"
          autoComplete="current-password"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="novaSenha">Nova senha</Label>
          <Input
            id="novaSenha"
            name="novaSenha"
            type="password"
            autoComplete="new-password"
            placeholder="mín. 6 caracteres"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmar">Confirmar nova senha</Label>
          <Input
            id="confirmar"
            name="confirmar"
            type="password"
            autoComplete="new-password"
          />
        </div>
      </div>
      {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Alterando…" : "Alterar senha"}
        </Button>
      </div>
    </form>
  );
}
