"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { alternarCanal, excluirCanal } from "./actions";
import { ExcluirConfirmado } from "../excluir-confirmado";

export function AtivoCanalSwitch({ id, ativo }: { id: number; ativo: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={ativo}
      disabled={pending}
      aria-label={ativo ? "Desativar canal" : "Ativar canal"}
      onCheckedChange={(v) => startTransition(async () => { await alternarCanal(id, v); })}
    />
  );
}

export function ExcluirCanalButton({ id, nome }: { id: number; nome: string }) {
  return (
    <ExcluirConfirmado
      titulo={`Excluir o canal “${nome}”?`}
      descricao="Essa ação não pode ser desfeita. Canal que já foi usado em atendimento não pode ser excluído — nesse caso, desative."
      excluir={() => excluirCanal(id)}
      sucesso={`“${nome}” excluído`}
    />
  );
}
