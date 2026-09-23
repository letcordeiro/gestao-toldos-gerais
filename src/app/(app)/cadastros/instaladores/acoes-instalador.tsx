"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { alternarInstalador, excluirInstalador } from "./actions";
import { ExcluirConfirmado } from "../excluir-confirmado";

export function AtivoInstaladorSwitch({
  id,
  ativo,
}: {
  id: number;
  ativo: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={ativo}
      disabled={pending}
      aria-label={ativo ? "Desativar instalador" : "Ativar instalador"}
      onCheckedChange={(valor) =>
        startTransition(async () => {
          await alternarInstalador(id, valor);
        })
      }
    />
  );
}

export function ExcluirInstaladorButton({ id, nome }: { id: number; nome: string }) {
  return (
    <ExcluirConfirmado
      titulo={`Excluir o instalador “${nome}”?`}
      descricao="Essa ação não pode ser desfeita. Instalador que já participou de instalação não pode ser excluído — nesse caso, desative."
      excluir={() => excluirInstalador(id)}
      sucesso={`“${nome}” excluído`}
    />
  );
}
