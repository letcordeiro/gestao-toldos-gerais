"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { alternarFornecedor, excluirFornecedor } from "./actions";

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

export function ExcluirFornecedorButton({
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
          const r = await excluirFornecedor(id);
          if (r.erro) toast.error(r.erro);
          else toast.success(`“${nome}” excluído`);
        })
      }
    >
      Excluir
    </Button>
  );
}
