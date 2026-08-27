"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { classificar } from "@/lib/pesquisa";
import { responderPesquisa, type RespostaState } from "./actions";

const NOTAS = Array.from({ length: 11 }, (_, i) => i);

// Cor da nota escolhida: vermelho até 6, laranja 7–8, verde 9–10.
const COR: Record<string, string> = {
  detrator: "bg-destructive text-white border-destructive",
  neutro: "bg-brand-orange text-white border-brand-orange",
  promotor: "bg-primary text-primary-foreground border-primary",
};

export function FormPesquisa({
  token,
  notaInicial,
  comentarioInicial,
}: {
  token: string;
  notaInicial: number | null;
  comentarioInicial: string | null;
}) {
  const [nota, setNota] = useState<number | null>(notaInicial);
  const [state, formAction, pending] = useActionState<RespostaState, FormData>(
    responderPesquisa,
    {}
  );

  if (state.ok) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-4xl">🙏</p>
        <h2 className="text-lg font-semibold">Obrigado!</h2>
        <p className="text-sm text-muted-foreground">
          Sua resposta foi registrada. Ela ajuda a gente a melhorar.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="nota" value={nota ?? ""} />

      <div>
        <p className="mb-3 text-sm font-medium">
          De 0 a 10, o quanto você indicaria a Toldos Gerais para um amigo?
        </p>
        {/* Grade de 11 botões: cabe no polegar e não precisa de arrastar. */}
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
          {NOTAS.map((n) => {
            const escolhida = nota === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={escolhida}
                onClick={() => setNota(n)}
                className={
                  "flex h-11 items-center justify-center rounded-lg border text-sm font-semibold transition-colors " +
                  (escolhida
                    ? COR[classificar(n)]
                    : "border-input bg-card hover:bg-secondary")
                }
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>Não indicaria</span>
          <span>Indicaria com certeza</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="comentario" className="text-sm font-medium">
          Quer contar o porquê? <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Textarea
          id="comentario"
          name="comentario"
          rows={4}
          defaultValue={comentarioInicial ?? ""}
          placeholder="O que foi bom, o que dava para melhorar…"
        />
      </div>

      {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || nota === null}
      >
        {pending ? "Enviando…" : "Enviar resposta"}
      </Button>
      {nota === null && (
        <p className="text-center text-xs text-muted-foreground">
          Escolha uma nota para enviar.
        </p>
      )}
    </form>
  );
}
