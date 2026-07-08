"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { alternarAtivo } from "./actions";

export function AtivoSwitch({ id, ativo }: { id: number; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={ativo}
      disabled={pending}
      onCheckedChange={(valor) =>
        startTransition(() => alternarAtivo(id, valor))
      }
    />
  );
}
