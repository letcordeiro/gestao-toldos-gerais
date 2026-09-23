"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { alternarFornecedor, excluirFornecedor } from "./actions";
import { ExcluirConfirmado } from "../excluir-confirmado";

export function AtivoFornecedorSwitch({
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
      aria-label={ativo ? "Desativar fornecedor" : "Ativar fornecedor"}
      onCheckedChange={(valor) =>
        startTransition(async () => {
          await alternarFornecedor(id, valor);
        })
      }
    />
  );
}

export function ExcluirFornecedorButton({ id, nome }: { id: number; nome: string }) {
  return (
    <ExcluirConfirmado
      titulo={`Excluir o fornecedor “${nome}”?`}
      descricao="Essa ação não pode ser desfeita. Fornecedor que já participou de cotação não pode ser excluído — nesse caso, desative."
      excluir={() => excluirFornecedor(id)}
      sucesso={`“${nome}” excluído`}
    />
  );
}
