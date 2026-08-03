"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { alternarAtivoAviso } from "./actions";

export function AtivoAvisoSwitch({ id, ativo }: { id: number; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={ativo}
      disabled={pending}
      aria-label={ativo ? "Desativar aviso" : "Ativar aviso"}
      onCheckedChange={(valor) =>
        startTransition(async () => {
          await alternarAtivoAviso(id, valor);
          toast.success(valor ? "Aviso ativado" : "Aviso desativado");
        })
      }
    />
  );
}
