"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { alternarInstalador, excluirInstalador } from "./actions";

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

export function ExcluirInstaladorButton({
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
          const r = await excluirInstalador(id);
          if (r.erro) toast.error(r.erro);
          else toast.success(`“${nome}” excluído`);
        })
      }
    >
      Excluir
    </Button>
  );
}
