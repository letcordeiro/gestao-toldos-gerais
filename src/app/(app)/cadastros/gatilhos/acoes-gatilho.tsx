"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { alternarGatilho, excluirGatilho } from "./actions";
import { ExcluirConfirmado } from "../excluir-confirmado";

export function AtivoGatilhoSwitch({
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
      aria-label={ativo ? "Desativar automação" : "Ativar automação"}
      onCheckedChange={(valor) =>
        startTransition(async () => {
          await alternarGatilho(id, valor);
          toast.success(valor ? "Automação ativada" : "Automação pausada");
        })
      }
    />
  );
}

export function ExcluirGatilhoButton({ id, nome }: { id: number; nome: string }) {
  return (
    <ExcluirConfirmado
      titulo={`Excluir a automação “${nome}”?`}
      descricao="Ela para de criar tarefas. As tarefas que já criou continuam na lista. Essa ação não pode ser desfeita. Se quiser só pausar, use o botão de ativo/inativo."
      excluir={() => excluirGatilho(id)}
      sucesso={`“${nome}” excluída`}
    />
  );
}
