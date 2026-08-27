"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  SITUACAO_CHAMADO_LABEL,
  type SituacaoChamado,
} from "@/lib/chamados";
import { adicionarInteracao, mudarSituacaoChamado } from "../actions";

const SITUACOES: SituacaoChamado[] = [
  "aberto",
  "em_andamento",
  "resolvido",
  "cancelado",
];

export function SituacaoChamadoSelect({
  chamadoId,
  situacao,
}: {
  chamadoId: number;
  situacao: SituacaoChamado;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Situação do chamado"
      value={situacao}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          const r = await mudarSituacaoChamado(chamadoId, e.target.value);
          if (r.erro) toast.error(r.erro);
          else router.refresh();
        })
      }
      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm font-medium shadow-sm"
    >
      {SITUACOES.map((s) => (
        <option key={s} value={s}>
          {SITUACAO_CHAMADO_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

export function NovaInteracao({ chamadoId }: { chamadoId: number }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        value={texto}
        placeholder="O que foi conversado ou feito…"
        onChange={(e) => setTexto(e.target.value)}
      />
      <Button
        size="sm"
        disabled={pending || texto.trim() === ""}
        onClick={() =>
          startTransition(async () => {
            const r = await adicionarInteracao(chamadoId, texto);
            if (r.erro) toast.error(r.erro);
            else {
              setTexto("");
              router.refresh();
            }
          })
        }
      >
        {pending ? "Salvando…" : "Registrar retorno"}
      </Button>
    </div>
  );
}
