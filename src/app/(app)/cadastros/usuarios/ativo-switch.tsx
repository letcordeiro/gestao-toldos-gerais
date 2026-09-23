"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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

  // O switch é controlado pela prop `ativo`, que só muda quando o servidor
  // grava. Se a action recusar, a prop não muda e o switch volta sozinho para
  // a posição de antes — o toast diz por quê.
  return (
    <Switch
      checked={ativo}
      disabled={pending}
      aria-label={ativo ? "Desativar usuário" : "Ativar usuário"}
      onCheckedChange={(valor) =>
        startTransition(async () => {
          const resultado = await alternarAtivoVendedor(id, valor);
          if (resultado.erro) toast.error(resultado.erro);
        })
      }
    />
  );
}
