"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mascaraMoeda } from "@/lib/format";
import { responderCotacao, type RespostaCotacaoState } from "./actions";

export type ItemPublico = {
  id: number;
  descricao: string;
  quantidade: string | null;
  unidade: string | null;
  valorAtual: string;
};

export function FormCotacao({
  token,
  itens,
  prazoInicial,
  observacaoInicial,
}: {
  token: string;
  itens: ItemPublico[];
  prazoInicial: string | null;
  observacaoInicial: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    RespostaCotacaoState,
    FormData
  >(responderCotacao, {});

  if (state.ok) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-4xl">✅</p>
        <h2 className="text-lg font-semibold">Cotação enviada!</h2>
        <p className="text-sm text-muted-foreground">
          Obrigado. Qualquer coisa a gente entra em contato.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-3">
        {itens.map((item, i) => (
          <div key={item.id} className="rounded-lg border p-3">
            <p className="text-sm font-medium">
              {i + 1}. {item.descricao}
            </p>
            {(item.quantidade || item.unidade) && (
              <p className="text-xs text-muted-foreground">
                {[item.quantidade, item.unidade].filter(Boolean).join(" ")}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                name={`item-${item.id}`}
                inputMode="decimal"
                defaultValue={item.valorAtual}
                placeholder="0,00"
                className="w-40 text-right tabular-nums"
                onChange={(e) => {
                  e.target.value = mascaraMoeda(e.target.value);
                }}
              />
              <span className="text-xs text-muted-foreground">
                preço unitário
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Não trabalha com algum item? É só deixar em branco.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="prazoEntrega">Prazo de entrega</Label>
        <Input
          id="prazoEntrega"
          name="prazoEntrega"
          defaultValue={prazoInicial ?? ""}
          placeholder="Ex.: 5 dias úteis"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacao">Observações</Label>
        <Textarea
          id="observacao"
          name="observacao"
          rows={3}
          defaultValue={observacaoInicial ?? ""}
          placeholder="Condição de pagamento, frete, o que for importante"
        />
      </div>

      {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Enviar cotação"}
      </Button>
    </form>
  );
}
