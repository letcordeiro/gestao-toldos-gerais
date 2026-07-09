"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { atribuirVendedor } from "../actions";

type VendedorOpcao = { id: number; nome: string };

// Seletor de vendedor responsável (só gestor). Salva ao trocar.
export function AtribuirVendedor({
  atendimentoId,
  vendedorId,
  vendedores,
}: {
  atendimentoId: number;
  vendedorId: number | null;
  vendedores: VendedorOpcao[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={vendedorId != null ? String(vendedorId) : ""}
      disabled={pending}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (!v) return;
        startTransition(async () => {
          await atribuirVendedor(atendimentoId, v);
          toast.success("Vendedor responsável atualizado");
        });
      }}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="" disabled>
        Sem vendedor
      </option>
      {vendedores.map((v) => (
        <option key={v.id} value={String(v.id)}>
          {v.nome}
        </option>
      ))}
    </select>
  );
}
