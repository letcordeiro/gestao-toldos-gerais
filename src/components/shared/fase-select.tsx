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
  const faseAtual = fases.find((f) => f.id === faseId);
  const cor = faseAtual?.cor;

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
      {/* O gatilho fica na cor definida para a fase selecionada. */}
      <SelectTrigger
        className="w-[200px] font-medium"
        style={
          cor
            ? {
                backgroundColor: `${cor}1a`,
                borderColor: `${cor}80`,
                color: cor,
              }
            : undefined
        }
      >
        <span className="flex items-center gap-2">
          {cor && (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: cor }}
            />
          )}
          <SelectValue />
        </span>
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
