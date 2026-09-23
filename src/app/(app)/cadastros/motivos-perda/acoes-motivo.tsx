"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { alternarMotivo, excluirMotivo } from "./actions";
import { ExcluirConfirmado } from "../excluir-confirmado";

export function AtivoMotivoSwitch({ id, ativo }: { id: number; ativo: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={ativo}
      disabled={pending}
      aria-label={ativo ? "Desativar motivo" : "Ativar motivo"}
      onCheckedChange={(valor) =>
        startTransition(async () => {
          await alternarMotivo(id, valor);
        })
      }
    />
  );
}

export function ExcluirMotivoButton({ id, nome }: { id: number; nome: string }) {
  return (
    <ExcluirConfirmado
      titulo={`Excluir o motivo “${nome}”?`}
      descricao="Essa ação não pode ser desfeita. Motivo que já foi usado em atendimento não pode ser excluído — nesse caso, desative."
      excluir={() => excluirMotivo(id)}
      sucesso={`“${nome}” excluído`}
    />
  );
}
