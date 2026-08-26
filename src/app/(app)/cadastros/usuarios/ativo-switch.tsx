"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { alternarAtivoVendedor } from "./actions";

export function AtivoVendedorSwitch({
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
      onCheckedChange={(valor) =>
        startTransition(() => alternarAtivoVendedor(id, valor))
      }
    />
  );
}
