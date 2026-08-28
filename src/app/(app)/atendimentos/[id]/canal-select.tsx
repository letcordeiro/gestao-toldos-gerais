"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { definirCanal } from "../actions";

/**
 * De onde este cliente veio. Editável depois porque quase nunca se sabe na
 * hora de abrir o atendimento — a pergunta costuma aparecer na conversa.
 */
export function CanalSelect({
  atendimentoId,
  canalId,
  canais,
}: {
  atendimentoId: number;
  canalId: number | null;
  canais: { id: number; nome: string }[];
}) {
  const router = useRouter();
  const [valor, setValor] = useState(canalId == null ? "" : String(canalId));
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Como o cliente chegou até nós"
      value={valor}
      disabled={pending}
      onChange={(e) => {
        const novo = e.target.value;
        setValor(novo);
        startTransition(async () => {
          try {
            await definirCanal(atendimentoId, novo === "" ? null : Number(novo));
            router.refresh();
          } catch {
            toast.error("Não deu para salvar a origem.");
          }
        });
      }}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
    >
      <option value="">Não informado</option>
      {canais.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nome}
        </option>
      ))}
    </select>
  );
}
