"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { letraOpcao } from "@/lib/contratos";
import { mascaraMoeda, parseParaCentavos } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarOpcoesContrato } from "../actions";

export type OpcaoPrecoForm = { rotulo: string; valor: number };

/**
 * Opções de preço do contrato: o mesmo produto em duas ou mais configurações,
 * com o cliente escolhendo na assinatura. Duas ou mais opções trocam o plano
 * de pagamento para percentual — sem valor fechado não há como somar reais.
 * Lista vazia devolve o contrato ao valor único.
 */
export function OpcoesPreco({
  contratoId,
  opcoesIniciais,
  editavel,
}: {
  contratoId: number;
  opcoesIniciais: OpcaoPrecoForm[];
  editavel: boolean;
}) {
  const [opcoes, setOpcoes] = useState<OpcaoPrecoForm[]>(opcoesIniciais);
  const [pending, startTransition] = useTransition();

  const alterar = (i: number, campo: keyof OpcaoPrecoForm, valor: unknown) => {
    setOpcoes((atual) =>
      atual.map((o, idx) => (idx === i ? { ...o, [campo]: valor } : o))
    );
  };

  const salvar = (proximas: OpcaoPrecoForm[]) => {
    startTransition(async () => {
      const r = await salvarOpcoesContrato(contratoId, proximas);
      if (r.erro) {
        toast.error(r.erro);
        return;
      }
      toast.success(
        proximas.length === 0
          ? "Opções removidas — o contrato voltou ao valor fechado"
          : "Opções salvas"
      );
    });
  };

  return (
    <div className="space-y-2">
      {opcoes.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          O contrato tem um valor fechado. Use opções quando o cliente ainda vai
          escolher entre duas configurações — o plano de pagamento passa a ser em
          percentual.
        </p>
      ) : (
        opcoes.map((opcao, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-end"
          >
            <div className="flex h-9 items-center text-sm font-semibold text-primary">
              Opção {letraOpcao(i)}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`opcao-rotulo-${i}`} className="text-xs">
                O que diferencia esta opção *
              </Label>
              <Input
                id={`opcao-rotulo-${i}`}
                value={opcao.rotulo}
                placeholder="ex.: 16,20 × 3,00 m"
                disabled={!editavel}
                onChange={(e) => alterar(i, "rotulo", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`opcao-valor-${i}`} className="text-xs">
                Valor *
              </Label>
              <Input
                id={`opcao-valor-${i}`}
                inputMode="decimal"
                className="w-36 text-right tabular-nums"
                disabled={!editavel}
                value={(opcao.valor / 100).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                onChange={(e) =>
                  alterar(
                    i,
                    "valor",
                    parseParaCentavos(mascaraMoeda(e.target.value)) ?? 0
                  )
                }
              />
            </div>
            {editavel && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover opção ${letraOpcao(i)}`}
                onClick={() => setOpcoes(opcoes.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))
      )}

      {editavel && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setOpcoes([...opcoes, { rotulo: "", valor: 0 }])
            }
          >
            <Plus className="size-4" /> Adicionar opção
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => salvar(opcoes)}
          >
            {pending ? "Salvando…" : "Salvar opções"}
          </Button>
          {opcoes.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setOpcoes([]);
                salvar([]);
              }}
            >
              Voltar ao valor fechado
            </Button>
          )}
        </div>
      )}

      {opcoes.length === 1 && (
        <p className="text-sm text-destructive">
          Uma opção só não é opção: adicione outra ou volte ao valor fechado.
        </p>
      )}
    </div>
  );
}
