"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { salvarAviso, type AvisoFormState } from "./actions";

type Aviso = {
  id: number;
  nome: string;
  gatilho: "orcamento_sem_resposta" | "atendimento_concluido";
  dias: number;
  mensagem: string;
  rearmeDias: number | null;
};

const VARIAVEIS = [
  ["{cliente}", "primeiro nome do cliente"],
  ["{vendedor}", "primeiro nome do vendedor"],
  ["{orcamento}", "número do orçamento"],
  ["{avaliacao}", "link de avaliação no Google"],
] as const;

const SELECT_CLASSES =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function AvisoDialog({
  aviso,
  trigger,
}: {
  aviso?: Aviso;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  // Repetição controlada para mostrar/esconder o campo de dias.
  const [repete, setRepete] = useState(aviso ? aviso.rearmeDias != null : true);
  const [state, formAction, pending] = useActionState<AvisoFormState, FormData>(
    salvarAviso,
    {}
  );

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{aviso ? "Editar aviso" : "Novo aviso"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {aviso && <input type="hidden" name="id" value={aviso.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome do aviso *</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={aviso?.nome}
              placeholder="Ex.: Cobrar retorno do orçamento"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gatilho">Quando avisar *</Label>
              <select
                id="gatilho"
                name="gatilho"
                defaultValue={aviso?.gatilho ?? "orcamento_sem_resposta"}
                className={SELECT_CLASSES}
              >
                <option value="orcamento_sem_resposta">
                  Orçamento enviado sem resposta
                </option>
                <option value="atendimento_concluido">
                  Atendimento concluído
                </option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dias">Depois de quantos dias *</Label>
              <Input
                id="dias"
                name="dias"
                type="number"
                min={0}
                max={365}
                defaultValue={aviso?.dias ?? 3}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mensagem">Mensagem do WhatsApp *</Label>
            <Textarea
              id="mensagem"
              name="mensagem"
              rows={6}
              defaultValue={aviso?.mensagem}
              placeholder="Olá, {cliente}! …"
            />
            <p className="text-xs text-muted-foreground">
              Variáveis:{" "}
              {VARIAVEIS.map(([chave, desc], i) => (
                <span key={chave}>
                  {i > 0 && " · "}
                  <code className="rounded bg-secondary px-1">{chave}</code>{" "}
                  {desc}
                </span>
              ))}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="repete">Depois do &quot;já contatei&quot;</Label>
              <select
                id="repete"
                value={repete ? "sim" : "nao"}
                onChange={(e) => setRepete(e.target.value === "sim")}
                className={SELECT_CLASSES}
              >
                <option value="sim">Avisar de novo depois de um tempo</option>
                <option value="nao">Não avisar de novo</option>
              </select>
            </div>
            {repete ? (
              <div className="space-y-1.5">
                <Label htmlFor="rearmeDias">Avisar de novo após (dias)</Label>
                <Input
                  id="rearmeDias"
                  name="rearmeDias"
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={aviso?.rearmeDias ?? 3}
                />
              </div>
            ) : (
              <input type="hidden" name="rearmeDias" value="" />
            )}
          </div>
          {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
