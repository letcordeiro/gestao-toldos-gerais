"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mudarStatusOrcamento } from "../actions";

const OPCOES = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "aprovado", label: "Aprovado" },
  { value: "recusado", label: "Recusado" },
];

export function StatusSelect({
  orcamentoId,
  status,
}: {
  orcamentoId: number;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      items={OPCOES}
      onValueChange={(valor) => {
        if (valor && valor !== status) {
          startTransition(() => mudarStatusOrcamento(orcamentoId, valor));
        }
      }}
    >
      <SelectTrigger className="w-[140px] bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPCOES.map((opcao) => (
          <SelectItem key={opcao.value} value={opcao.value}>
            {opcao.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
