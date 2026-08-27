"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { TIPO_TAREFA_LABEL, paraInputDate } from "@/lib/tarefas";
import { salvarTarefa, type TarefaFormState } from "./actions";

const SELECT_CLASSES =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export type TarefaEdicao = {
  id: number;
  titulo: string;
  tipo: keyof typeof TIPO_TAREFA_LABEL;
  prioridade: "baixa" | "media" | "alta";
  descricao: string | null;
  previstaEm: Date | null;
  responsavelId: number | null;
};

export function TarefaDialog({
  tarefa,
  atendimentoId,
  orcamentoId,
  contratoId,
  responsaveis = [],
  trigger,
}: {
  tarefa?: TarefaEdicao;
  atendimentoId?: number;
  orcamentoId?: number;
  contratoId?: number;
  responsaveis?: { id: number; nome: string }[];
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<TarefaFormState, FormData>(
    salvarTarefa,
    {}
  );

  useEffect(() => {
    if (state.ok) {
      setAberto(false);
      router.refresh();
    }
  }, [state, router]);

  // Padrão de prazo para tarefa nova: hoje. O prazo é o que faz a tarefa
  // aparecer na tela certa — deixar em branco esconde ela em "sem data".
  const hoje = paraInputDate(new Date());

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tarefa ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {tarefa && <input type="hidden" name="id" value={tarefa.id} />}
          {atendimentoId && (
            <input type="hidden" name="atendimentoId" value={atendimentoId} />
          )}
          {orcamentoId && (
            <input type="hidden" name="orcamentoId" value={orcamentoId} />
          )}
          {contratoId && (
            <input type="hidden" name="contratoId" value={contratoId} />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="titulo">O que precisa ser feito *</Label>
            <Input
              id="titulo"
              name="titulo"
              defaultValue={tarefa?.titulo}
              placeholder="Ex.: Ligar para confirmar a medida"
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                name="tipo"
                defaultValue={tarefa?.tipo ?? "ligacao"}
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
              <Label htmlFor="prioridade">Prioridade</Label>
              <select
                id="prioridade"
                name="prioridade"
                defaultValue={tarefa?.prioridade ?? "media"}
                className={SELECT_CLASSES}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prevista">Para quando</Label>
              <Input
                id="prevista"
                name="prevista"
                type="date"
                defaultValue={
                  tarefa ? paraInputDate(tarefa.previstaEm) : hoje
                }
              />
            </div>
          </div>

          {responsaveis.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="responsavelId">Responsável</Label>
              <select
                id="responsavelId"
                name="responsavelId"
                defaultValue={tarefa?.responsavelId ?? ""}
                className={SELECT_CLASSES}
              >
                <option value="">Eu mesma</option>
                {responsaveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Detalhes</Label>
            <Textarea
              id="descricao"
              name="descricao"
              rows={3}
              defaultValue={tarefa?.descricao ?? ""}
              placeholder="Opcional"
            />
          </div>

          {state.erro && (
            <p className="text-sm text-destructive">{state.erro}</p>
          )}

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
