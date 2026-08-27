"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { alternarGatilho, excluirGatilho } from "./actions";

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

export function ExcluirGatilhoButton({
  id,
  nome,
}: {
  id: number;
  nome: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await excluirGatilho(id);
          toast.success(`“${nome}” excluída`);
        })
      }
    >
      Excluir
    </Button>
  );
}
