"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { paraInputDate } from "@/lib/tarefas";
import { salvarCotacao, type CotacaoFormState } from "./actions";

type Item = { descricao: string; quantidade: string; unidade: string };

const ITEM_VAZIO: Item = { descricao: "", quantidade: "", unidade: "" };

export type CotacaoInicial = {
  id: number;
  titulo: string;
  orcamentoId: number | null;
  prazoResposta: Date | null;
  observacoes: string | null;
  observacoesInternas: string | null;
  itens: Item[];
  fornecedorIds: number[];
};

export function CotacaoForm({
  fornecedores,
  orcamentos,
  cotacao,
}: {
  fornecedores: { id: number; nome: string; fornece: string | null }[];
  orcamentos: { id: number; numero: string; clienteNome: string }[];
  cotacao?: CotacaoInicial;
}) {
  const router = useRouter();
  const [itens, setItens] = useState<Item[]>(
    cotacao?.itens.length ? cotacao.itens : [{ ...ITEM_VAZIO }]
  );
  const [state, formAction, pending] = useActionState<
    CotacaoFormState,
    FormData
  >(salvarCotacao, {});

  useEffect(() => {
    if (state.ok && state.criadoId) router.push(`/cotacoes/${state.criadoId}`);
  }, [state, router]);

  const alterar = (i: number, campo: keyof Item, valor: string) =>
    setItens((atual) =>
      atual.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it))
    );

  return (
    <form action={formAction} className="space-y-4">
      {cotacao && <input type="hidden" name="id" value={cotacao.id} />}
      <input
        type="hidden"
        name="itens"
        value={JSON.stringify(itens.filter((i) => i.descricao.trim() !== ""))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da cotação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              name="titulo"
              defaultValue={cotacao?.titulo}
              placeholder="Ex.: Lona PVC e perfil para a obra do Dr. Paulo"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="orcamentoId">Orçamento relacionado</Label>
              <select
                id="orcamentoId"
                name="orcamentoId"
                defaultValue={cotacao?.orcamentoId ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Nenhum</option>
                {orcamentos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero} — {o.clienteNome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prazoResposta">Responder até</Label>
              <Input
                id="prazoResposta"
                name="prazoResposta"
                type="date"
                defaultValue={paraInputDate(cotacao?.prazoResposta ?? null)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Material</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {itens.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[1fr_100px_100px_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Item {i + 1}
                </Label>
                <Input
                  value={item.descricao}
                  placeholder="Ex.: Lona PVC branca 900g"
                  onChange={(e) => alterar(i, "descricao", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Qtde</Label>
                <Input
                  value={item.quantidade}
                  placeholder="12"
                  onChange={(e) => alterar(i, "quantidade", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Unidade</Label>
                <Input
                  value={item.unidade}
                  placeholder="m²"
                  onChange={(e) => alterar(i, "unidade", e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remover item ${i + 1}`}
                disabled={itens.length === 1}
                onClick={() =>
                  setItens((a) => a.filter((_, idx) => idx !== i))
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItens((a) => [...a, { ...ITEM_VAZIO }])}
          >
            <Plus className="size-4" /> Adicionar item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quem vai cotar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada fornecedor recebe um link próprio e não vê o preço dos outros.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {fornecedores.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum fornecedor ativo. Cadastre em Configurações → Fornecedores.
            </p>
          )}
          {fornecedores.map((f) => (
            <label key={f.id} className="flex cursor-pointer gap-2.5">
              <input
                type="checkbox"
                name="fornecedorIds"
                value={f.id}
                defaultChecked={cotacao?.fornecedorIds.includes(f.id)}
                className="mt-0.5 size-4 shrink-0"
              />
              <span>
                <span className="block text-sm font-medium">{f.nome}</span>
                {f.fornece && (
                  <span className="block text-xs text-muted-foreground">
                    {f.fornece}
                  </span>
                )}
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="observacoes">O fornecedor vê</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              defaultValue={cotacao?.observacoes ?? ""}
              placeholder="Condição de pagamento, prazo, entrega no local…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacoesInternas">Só a equipe vê</Label>
            <Textarea
              id="observacoesInternas"
              name="observacoesInternas"
              rows={2}
              defaultValue={cotacao?.observacoesInternas ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : cotacao ? "Salvar" : "Criar cotação"}
        </Button>
      </div>
    </form>
  );
}
