"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { alternarAtivoCliente } from "./actions";

export function AtivoClienteSwitch({
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
      aria-label={ativo ? "Inativar cliente" : "Ativar cliente"}
      onCheckedChange={(valor) =>
        startTransition(async () => {
          await alternarAtivoCliente(id, valor);
          toast.success(valor ? "Cliente ativado" : "Cliente inativado");
        })
      }
    />
  );
}
