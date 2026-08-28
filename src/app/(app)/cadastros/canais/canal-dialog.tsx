"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarCanal, type CanalFormState } from "./actions";

export function CanalDialog({
  canal,
  trigger,
}: {
  canal?: { id: number; nome: string; noCadastroPublico: boolean };
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<CanalFormState, FormData>(
    salvarCanal,
    {}
  );

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{canal ? "Editar canal" : "Novo canal"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {canal && <input type="hidden" name="id" value={canal.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Canal *</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={canal?.nome}
              placeholder="Ex.: Indicação de cliente"
              autoFocus
            />
          </div>
          <label className="flex cursor-pointer gap-2.5">
            <input
              type="checkbox"
              name="noCadastroPublico"
              defaultChecked={canal?.noCadastroPublico ?? true}
              className="mt-0.5 size-4 shrink-0"
            />
            <span>
              <span className="block text-sm font-medium">
                Perguntar no cadastro público
              </span>
              <span className="block text-xs text-muted-foreground">
                Nem todo canal faz sentido perguntar ao cliente — “cliente
                antigo”, por exemplo, quem sabe é a equipe.
              </span>
            </span>
          </label>
          {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
