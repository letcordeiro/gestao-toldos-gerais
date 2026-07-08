"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mudarFase } from "@/app/(app)/atendimentos/actions";

type Fase = { id: number; nome: string; cor: string };

export function FaseSelect({
  atendimentoId,
  faseId,
  fases,
}: {
  atendimentoId: number;
  faseId: number;
  fases: Fase[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={String(faseId)}
      disabled={pending}
      items={fases.map((f) => ({ value: String(f.id), label: f.nome }))}
      onValueChange={(valor) => {
        if (valor && valor !== String(faseId)) {
          startTransition(() => mudarFase(atendimentoId, Number(valor)));
        }
      }}
    >
      <SelectTrigger className="w-[200px] bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {fases.map((fase) => (
          <SelectItem key={fase.id} value={String(fase.id)}>
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: fase.cor }}
            />
            {fase.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
