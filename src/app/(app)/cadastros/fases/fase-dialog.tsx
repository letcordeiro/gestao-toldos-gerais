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
import { salvarFase, type FaseFormState } from "./actions";

type Fase = { id: number; nome: string; ordem: number; cor: string };

export function FaseDialog({
  fase,
  proximaOrdem,
  trigger,
}: {
  fase?: Fase;
  proximaOrdem?: number;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<FaseFormState, FormData>(
    salvarFase,
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
          <DialogTitle>{fase ? "Editar fase" : "Nova fase"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {fase && <input type="hidden" name="id" value={fase.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={fase?.nome} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ordem">Ordem *</Label>
              <Input
                id="ordem"
                name="ordem"
                type="number"
                min={1}
                defaultValue={fase?.ordem ?? proximaOrdem ?? 1}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cor">Cor *</Label>
              <Input
                id="cor"
                name="cor"
                type="color"
                className="h-9 p-1"
                defaultValue={fase?.cor ?? "#3B82F6"}
              />
            </div>
          </div>
          {state.erro && (
            <p className="text-sm text-destructive">{state.erro}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
