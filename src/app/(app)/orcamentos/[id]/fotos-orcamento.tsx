"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  adicionarFotoOrcamento,
  removerFotoOrcamento,
  type FotoState,
} from "../actions";

type Foto = { id: number; arquivo: string };

export function FotosOrcamento({
  orcamentoId,
  fotos,
  podeEditar,
}: {
  orcamentoId: number;
  fotos: Foto[];
  podeEditar: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FotoState, FormData>(
    adicionarFotoOrcamento,
    {}
  );
  const [removendo, startRemover] = useTransition();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
    if (state.erro) toast.error(state.erro);
  }, [state]);

  return (
    <div className="space-y-3">
      {fotos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma foto anexada.
          {podeEditar ? " Adicione fotos para aparecerem na proposta." : ""}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fotos.map((foto) => (
            <div
              key={foto.id}
              className="group relative aspect-square overflow-hidden rounded-md border bg-secondary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/orcamentos/${orcamentoId}/fotos/${foto.id}`}
                alt="Foto do orçamento"
                className="h-full w-full object-cover"
              />
              {podeEditar && (
                <button
                  type="button"
                  disabled={removendo}
                  onClick={() =>
                    startRemover(async () => {
                      await removerFotoOrcamento(foto.id);
                      toast.success("Foto removida");
                    })
                  }
                  className="absolute right-1 top-1 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {podeEditar && (
        <form ref={formRef} action={formAction} className="space-y-2">
          <input type="hidden" name="orcamentoId" value={orcamentoId} />
          <FileInput pending={pending} />
          {state.erro && (
            <p className="text-sm text-destructive">{state.erro}</p>
          )}
        </form>
      )}
    </div>
  );
}

// Input de arquivo + botão de envio.
function FileInput({ pending }: { pending: boolean }) {
  const [nome, setNome] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="cursor-pointer">
        <span className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-secondary">
          Escolher imagem
        </span>
        <input
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => setNome(e.target.files?.[0]?.name ?? "")}
        />
      </label>
      {nome && (
        <span className="max-w-[10rem] truncate text-sm text-muted-foreground">
          {nome}
        </span>
      )}
      <Button type="submit" size="sm" disabled={!nome || pending}>
        {pending ? "Enviando…" : "Adicionar foto"}
      </Button>
    </div>
  );
}
