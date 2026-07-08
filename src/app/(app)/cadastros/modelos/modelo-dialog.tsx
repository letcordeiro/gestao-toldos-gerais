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
import { salvarModelo, type ModeloFormState } from "./actions";

type Modelo = {
  id: number;
  nome: string;
  descricaoMaterial: string | null;
  estruturaAluminio: string | null;
  estruturaFerro: string | null;
  fixacaoVedacao: string | null;
};

export function ModeloDialog({
  modelo,
  trigger,
}: {
  modelo?: Modelo;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<
    ModeloFormState,
    FormData
  >(salvarModelo, {});

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modelo ? "Editar modelo" : "Novo modelo"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {modelo && <input type="hidden" name="id" value={modelo.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={modelo?.nome} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descricaoMaterial">Descrição do material</Label>
            <Textarea
              id="descricaoMaterial"
              name="descricaoMaterial"
              rows={3}
              defaultValue={modelo?.descricaoMaterial ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estruturaAluminio">Estrutura — alumínio</Label>
            <Textarea
              id="estruturaAluminio"
              name="estruturaAluminio"
              rows={3}
              defaultValue={modelo?.estruturaAluminio ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estruturaFerro">Estrutura — ferro</Label>
            <Textarea
              id="estruturaFerro"
              name="estruturaFerro"
              rows={3}
              defaultValue={modelo?.estruturaFerro ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fixacaoVedacao">Fixação e vedação</Label>
            <Textarea
              id="fixacaoVedacao"
              name="fixacaoVedacao"
              rows={3}
              defaultValue={modelo?.fixacaoVedacao ?? ""}
            />
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
