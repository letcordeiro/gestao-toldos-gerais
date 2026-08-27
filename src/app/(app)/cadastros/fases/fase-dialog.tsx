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

type Fase = {
  id: number;
  nome: string;
  ordem: number;
  cor: string;
  liberaInstalacao: boolean;
  exibirNaListagem: boolean;
  terminal: boolean;
  ehPerdido: boolean;
};

// O que cada marcação muda no sistema — escrito do lado de quem usa, não do
// lado do banco.
const FLAGS: { nome: keyof Fase; rotulo: string; ajuda: string }[] = [
  {
    nome: "exibirNaListagem",
    rotulo: "Aparece na lista de atendimentos",
    ajuda: "Desligado, só quem escolher esta fase no filtro enxerga.",
  },
  {
    nome: "liberaInstalacao",
    rotulo: "Negócio fechado",
    ajuda:
      "Aprova o orçamento e libera a ficha de instalação e o contrato.",
  },
  {
    nome: "terminal",
    rotulo: "Encerra o atendimento",
    ajuda: "Sai da conta de “em aberto” no painel.",
  },
  {
    nome: "ehPerdido",
    rotulo: "Negócio perdido",
    ajuda: "Pede o motivo da perda e recusa os orçamentos que aguardavam.",
  },
];

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
      <DialogContent className="sm:max-w-md">
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
          <div className="space-y-2 rounded-lg border p-3">
            {FLAGS.map((f) => (
              <label key={f.nome} className="flex cursor-pointer gap-2.5">
                <input
                  type="checkbox"
                  name={f.nome}
                  defaultChecked={
                    fase
                      ? Boolean(fase[f.nome])
                      : f.nome === "exibirNaListagem"
                  }
                  className="mt-0.5 size-4 shrink-0"
                />
                <span>
                  <span className="block text-sm font-medium">{f.rotulo}</span>
                  <span className="block text-xs text-muted-foreground">
                    {f.ajuda}
                  </span>
                </span>
              </label>
            ))}
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
