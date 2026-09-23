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
  { value: "agendado", label: "Aguardando envio" },
  { value: "enviando", label: "Enviando" },
  { value: "enviado", label: "Enviado" },
  { value: "falha_envio", label: "Falha no envio" },
  { value: "aprovado", label: "Aprovado" },
  { value: "recusado", label: "Recusado" },
];

// "Enviando" e "Enviado" só o worker grava, depois que a Evolution confirma o
// envio; "Aguardando envio" depende do vendedor ter envio automático e de o
// orçamento nunca ter saído. O servidor ignora essas escolhas em silêncio, então
// oferecê-las fazia o seletor piscar e voltar sem explicar nada.
function opcaoBloqueada(valor: string, podeAgendar: boolean) {
  if (valor === "enviado" || valor === "enviando") return true;
  if (valor === "agendado") return !podeAgendar;
  return false;
}

export function StatusSelect({
  orcamentoId,
  status,
  podeAgendar,
}: {
  orcamentoId: number;
  status: string;
  /** Mesma regra de `mudarStatusOrcamento`: envio automático liberado e sem `enviadoEm`. */
  podeAgendar: boolean;
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
          <SelectItem
            key={opcao.value}
            value={opcao.value}
            // O status atual continua escolhível, senão o seletor não teria o
            // que mostrar quando o orçamento está, por exemplo, "Enviado".
            disabled={
              opcao.value !== status && opcaoBloqueada(opcao.value, podeAgendar)
            }
          >
            {opcao.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
