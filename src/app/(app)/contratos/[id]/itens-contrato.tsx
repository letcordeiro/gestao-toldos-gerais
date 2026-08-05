"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarItensContrato } from "../actions";

export type ItemContrato = {
  modelo: string;
  cor: string;
  medidasM2: string;
  descricaoExtra: string;
};

export function ItensContrato({
  contratoId,
  itensIniciais,
  editavel,
}: {
  contratoId: number;
  itensIniciais: ItemContrato[];
  editavel: boolean;
}) {
  const [itens, setItens] = useState<ItemContrato[]>(itensIniciais);
  const [pending, startTransition] = useTransition();

  const alterar = (i: number, campo: keyof ItemContrato, valor: string) => {
    setItens((atual) =>
      atual.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it))
    );
  };

  const salvar = () => {
    startTransition(async () => {
      const r = await salvarItensContrato(contratoId, itens);
      if (r.erro) toast.error(r.erro);
      else toast.success("Itens salvos");
    });
  };

  return (
    <div className="space-y-2">
      {itens.length === 0 && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Nenhum item. Adicione ao menos um produto.
        </p>
      )}
      {itens.map((item, i) => (
        <div key={i} className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`modelo-${i}`} className="text-xs">
              Modelo *
            </Label>
            <Input
              id={`modelo-${i}`}
              value={item.modelo}
              disabled={!editavel}
              onChange={(e) => alterar(i, "modelo", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`cor-${i}`} className="text-xs">
              Cor
            </Label>
            <Input
              id={`cor-${i}`}
              value={item.cor}
              disabled={!editavel}
              onChange={(e) => alterar(i, "cor", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`medidas-${i}`} className="text-xs">
              Medidas
            </Label>
            <Input
              id={`medidas-${i}`}
              value={item.medidasM2}
              disabled={!editavel}
              placeholder="3,00 × 2,50 m"
              onChange={(e) => alterar(i, "medidasM2", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`extra-${i}`} className="text-xs">
              Descrição extra
            </Label>
            <div className="flex gap-1">
              <Input
                id={`extra-${i}`}
                value={item.descricaoExtra}
                disabled={!editavel}
                onChange={(e) => alterar(i, "descricaoExtra", e.target.value)}
              />
              {editavel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remover item"
                  className="text-destructive"
                  onClick={() =>
                    setItens((atual) => atual.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      {editavel && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setItens((atual) => [
                ...atual,
                { modelo: "", cor: "", medidasM2: "", descricaoExtra: "" },
              ])
            }
          >
            <Plus className="size-4" /> Adicionar item
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={salvar}>
            {pending ? "Salvando…" : "Salvar itens"}
          </Button>
        </div>
      )}
    </div>
  );
}
