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
// "Falha no envio" também é só do serviço: escolhida à mão, ela fazia o
// serviço mandar a proposta DE NOVO ao cliente (auditoria de 07/10/2026).
function opcaoBloqueada(valor: string, podeAgendar: boolean) {
  if (valor === "enviado" || valor === "enviando" || valor === "falha_envio")
    return true;
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
      // Enquanto o serviço está mandando, ninguém mexe: o resultado do envio
      // se perderia (ver atualizarOrcamento).
      disabled={pending || status === "enviando"}
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
