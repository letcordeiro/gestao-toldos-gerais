"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DOCUMENTO_LABEL,
  exemplo,
  type DocumentoNumerado,
} from "@/lib/numeracao";
import { salvarNumeracao, type NumeracaoFormState } from "./actions";

export function NumeracaoForm({
  documento,
  prefixo: prefixoInicial,
  incluiAno: incluiAnoInicial,
  digitos: digitosInicial,
  ultimoUsado,
}: {
  documento: DocumentoNumerado;
  prefixo: string;
  incluiAno: boolean;
  digitos: number;
  ultimoUsado: string | null;
}) {
  const [prefixo, setPrefixo] = useState(prefixoInicial);
  const [incluiAno, setIncluiAno] = useState(incluiAnoInicial);
  const [digitos, setDigitos] = useState(digitosInicial);
  const [state, formAction, pending] = useActionState<
    NumeracaoFormState,
    FormData
  >(salvarNumeracao, {});

  useEffect(() => {
    if (state.ok) toast.success("Numeração salva");
  }, [state]);

  const ano = new Date().getFullYear();
  const previa = exemplo({ prefixo, incluiAno, digitos }, ano);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <input type="hidden" name="documento" value={documento} />
      <h2 className="font-semibold">{DOCUMENTO_LABEL[documento]}</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`prefixo-${documento}`}>Prefixo</Label>
          <Input
            id={`prefixo-${documento}`}
            name="prefixo"
            value={prefixo}
            maxLength={10}
            placeholder="Ex.: CT"
            onChange={(e) => setPrefixo(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`digitos-${documento}`}>Dígitos</Label>
          <Input
            id={`digitos-${documento}`}
            name="digitos"
            type="number"
            min={1}
            max={10}
            value={digitos}
            onChange={(e) => setDigitos(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Ano</Label>
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="incluiAno"
              checked={incluiAno}
              onChange={(e) => setIncluiAno(e.target.checked)}
              className="size-4"
            />
            Incluir o ano
          </label>
        </div>
      </div>

      <p className="text-sm">
        <span className="text-muted-foreground">O próximo sai como </span>
        <strong className="tabular-nums">{previa}</strong>
        {ultimoUsado && (
          <span className="text-muted-foreground">
            {" "}
            · último emitido: <span className="tabular-nums">{ultimoUsado}</span>
          </span>
        )}
      </p>

      {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
