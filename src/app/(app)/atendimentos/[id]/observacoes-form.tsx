"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  atualizarObservacoes,
  type ObservacoesState,
} from "../actions";

export function ObservacoesForm({
  atendimentoId,
  valorInicial,
}: {
  atendimentoId: number;
  valorInicial: string;
}) {
  const [state, formAction, pending] = useActionState<
    ObservacoesState,
    FormData
  >(atualizarObservacoes, {});
  const jaMontou = useRef(false);

  useEffect(() => {
    if (jaMontou.current && state.ok) toast.success("Observações salvas");
    jaMontou.current = true;
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="atendimentoId" value={atendimentoId} />
      <Textarea
        name="observacoes"
        rows={5}
        defaultValue={valorInicial}
        placeholder="Anotações do atendimento…"
      />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Salvar observações"}
      </Button>
    </form>
  );
}
