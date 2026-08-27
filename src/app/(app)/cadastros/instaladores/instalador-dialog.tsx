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
import { Textarea } from "@/components/ui/textarea";
import { InputTelefone } from "@/components/shared/input-telefone";
import { salvarInstalador, type InstaladorFormState } from "./actions";

export function InstaladorDialog({
  instalador,
  trigger,
}: {
  instalador?: {
    id: number;
    nome: string;
    telefone: string | null;
    comissaoPadraoPercent: number | null;
    observacoes: string | null;
  };
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<
    InstaladorFormState,
    FormData
  >(salvarInstalador, {});

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {instalador ? "Editar instalador" : "Novo instalador"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {instalador && <input type="hidden" name="id" value={instalador.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={instalador?.nome}
              autoFocus
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="telefone">WhatsApp</Label>
              <InputTelefone
                id="telefone"
                name="telefone"
                defaultValue={instalador?.telefone ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comissaoPadraoPercent">Comissão padrão (%)</Label>
              <Input
                id="comissaoPadraoPercent"
                name="comissaoPadraoPercent"
                type="number"
                min={0}
                max={100}
                step="0.5"
                defaultValue={instalador?.comissaoPadraoPercent ?? ""}
                placeholder="Ex.: 10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={2}
              defaultValue={instalador?.observacoes ?? ""}
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
