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
import { EVENTO_LABEL } from "@/lib/gatilhos";
import { TIPO_TAREFA_LABEL } from "@/lib/tarefas";
import { salvarGatilho, type GatilhoFormState } from "./actions";

const SELECT_CLASSES =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const VARIAVEIS = [
  ["{cliente}", "primeiro nome do cliente"],
  ["{vendedor}", "primeiro nome do vendedor"],
  ["{orcamento}", "número do orçamento ou contrato"],
  ["{avaliacao}", "link de avaliação no Google"],
] as const;

type Gatilho = {
  id: number;
  nome: string;
  evento: keyof typeof EVENTO_LABEL;
  faseId: number | null;
  tarefaTipo: keyof typeof TIPO_TAREFA_LABEL;
  tarefaTitulo: string;
  tarefaPrioridade: "baixa" | "media" | "alta";
  prazoDias: number;
  mensagem: string | null;
};

export function GatilhoDialog({
  gatilho,
  fases,
  trigger,
}: {
  gatilho?: Gatilho;
  fases: { id: number; nome: string }[];
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  const [evento, setEvento] = useState<string>(
    gatilho?.evento ?? "entrou_na_fase"
  );
  const [state, formAction, pending] = useActionState<
    GatilhoFormState,
    FormData
  >(salvarGatilho, {});

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {gatilho ? "Editar automação" : "Nova automação"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {gatilho && <input type="hidden" name="id" value={gatilho.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={gatilho?.nome}
              placeholder="Ex.: Follow-up do orçamento"
            />
          </div>

          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quando
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="evento">Acontecer isto *</Label>
              <select
                id="evento"
                name="evento"
                value={evento}
                onChange={(e) => setEvento(e.target.value)}
                className={SELECT_CLASSES}
              >
                {Object.entries(EVENTO_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo[0].toUpperCase() + rotulo.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {evento === "entrou_na_fase" && (
              <div className="space-y-1.5">
                <Label htmlFor="faseId">Qual fase *</Label>
                <select
                  id="faseId"
                  name="faseId"
                  defaultValue={gatilho?.faseId ?? ""}
                  className={SELECT_CLASSES}
                >
                  <option value="">Selecione…</option>
                  {fases.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Então criar a tarefa
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="tarefaTitulo">Título da tarefa *</Label>
              <Input
                id="tarefaTitulo"
                name="tarefaTitulo"
                defaultValue={gatilho?.tarefaTitulo}
                placeholder="Ex.: Perguntar se o cliente viu a proposta"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="tarefaTipo">Tipo</Label>
                <select
                  id="tarefaTipo"
                  name="tarefaTipo"
                  defaultValue={gatilho?.tarefaTipo ?? "ligacao"}
                  className={SELECT_CLASSES}
                >
                  {Object.entries(TIPO_TAREFA_LABEL).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tarefaPrioridade">Prioridade</Label>
                <select
                  id="tarefaPrioridade"
                  name="tarefaPrioridade"
                  defaultValue={gatilho?.tarefaPrioridade ?? "media"}
                  className={SELECT_CLASSES}
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prazoDias">Prazo (dias)</Label>
                <Input
                  id="prazoDias"
                  name="prazoDias"
                  type="number"
                  min={0}
                  max={365}
                  defaultValue={gatilho?.prazoDias ?? 3}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mensagem">Mensagem de WhatsApp</Label>
              <Textarea
                id="mensagem"
                name="mensagem"
                rows={4}
                defaultValue={gatilho?.mensagem ?? ""}
                placeholder="Opcional. Se preencher, a tarefa ganha um botão que abre o WhatsApp com este texto pronto."
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
          </fieldset>

          {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
