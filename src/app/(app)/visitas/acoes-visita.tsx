"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SITUACAO_VISITA_LABEL,
  type SituacaoVisita,
} from "@/lib/visitas";
import { excluirVisita, mudarSituacaoVisita } from "./actions";

const SITUACOES: SituacaoVisita[] = [
  "agendada",
  "confirmada",
  "realizada",
  "nao_compareceu",
  "cancelada",
];

export function SituacaoVisitaSelect({
  visitaId,
  situacao,
}: {
  visitaId: number;
  situacao: SituacaoVisita;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label="Situação da visita"
      value={situacao}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          const r = await mudarSituacaoVisita(visitaId, e.target.value);
          if (r.erro) toast.error(r.erro);
          else router.refresh();
        })
      }
      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs font-medium"
    >
      {SITUACOES.map((s) => (
        <option key={s} value={s}>
          {SITUACAO_VISITA_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

export function ExcluirVisitaButton({ visitaId }: { visitaId: number }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Excluir visita"
      disabled={ocupado}
      onClick={() => {
        setOcupado(true);
        startTransition(async () => {
          await excluirVisita(visitaId);
          router.refresh();
          setOcupado(false);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
