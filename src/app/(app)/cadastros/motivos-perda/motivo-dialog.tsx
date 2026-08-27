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
import { salvarMotivo, type MotivoFormState } from "./actions";

export function MotivoDialog({
  motivo,
  trigger,
}: {
  motivo?: { id: number; nome: string };
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<MotivoFormState, FormData>(
    salvarMotivo,
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
          <DialogTitle>{motivo ? "Editar motivo" : "Novo motivo"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {motivo && <input type="hidden" name="id" value={motivo.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Motivo *</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={motivo?.nome}
              placeholder="Ex.: Preço acima do orçamento do cliente"
              autoFocus
            />
          </div>
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
