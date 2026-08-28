"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { alternarCanal, excluirCanal } from "./actions";

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
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await excluirCanal(id);
          if (r.erro) toast.error(r.erro);
          else toast.success(`“${nome}” excluído`);
        })
      }
    >
      Excluir
    </Button>
  );
}
