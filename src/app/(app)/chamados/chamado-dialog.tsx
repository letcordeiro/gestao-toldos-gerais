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
import { TIPO_CHAMADO_LABEL } from "@/lib/chamados";
import { salvarChamado, type ChamadoFormState } from "./actions";

const SELECT_CLASSES =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export type ChamadoEdicao = {
  id: number;
  assunto: string;
  descricao: string | null;
  tipo: "receptivo" | "ativo";
  prioridade: "baixa" | "media" | "alta";
  naGarantia: boolean | null;
  responsavelId: number | null;
  orcamentoId: number | null;
};

export function ChamadoDialog({
  chamado,
  atendimentoId,
  orcamentos = [],
  responsaveis = [],
  irParaChamado = false,
  trigger,
}: {
  chamado?: ChamadoEdicao;
  atendimentoId: number;
  orcamentos?: { id: number; numero: string }[];
  responsaveis?: { id: number; nome: string }[];
  /** Depois de criar, abre o chamado — usado quando vem do atendimento. */
  irParaChamado?: boolean;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<
    ChamadoFormState,
    FormData
  >(salvarChamado, {});

  useEffect(() => {
    if (!state.ok) return;
    setAberto(false);
    if (irParaChamado && state.criadoId) router.push(`/chamados/${state.criadoId}`);
    else router.refresh();
  }, [state, router, irParaChamado]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {chamado ? "Editar chamado" : "Novo chamado"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {chamado && <input type="hidden" name="id" value={chamado.id} />}
          <input type="hidden" name="atendimentoId" value={atendimentoId} />

          <div className="space-y-1.5">
            <Label htmlFor="assunto">Assunto *</Label>
            <Input
              id="assunto"
              name="assunto"
              defaultValue={chamado?.assunto}
              placeholder="Ex.: Goteira na emenda do toldo"
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Origem</Label>
              <select
                id="tipo"
                name="tipo"
                defaultValue={chamado?.tipo ?? "receptivo"}
                className={SELECT_CLASSES}
              >
                {Object.entries(TIPO_CHAMADO_LABEL).map(([valor, rotulo]) => (
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
                defaultValue={chamado?.prioridade ?? "media"}
                className={SELECT_CLASSES}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="naGarantia">Garantia</Label>
              <select
                id="naGarantia"
                name="naGarantia"
                defaultValue={
                  chamado?.naGarantia == null
                    ? ""
                    : chamado.naGarantia
                      ? "sim"
                      : "nao"
                }
                className={SELECT_CLASSES}
              >
                <option value="">A definir</option>
                <option value="sim">Na garantia</option>
                <option value="nao">Fora da garantia</option>
              </select>
            </div>
          </div>

          {orcamentos.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="orcamentoId">Serviço relacionado</Label>
              <select
                id="orcamentoId"
                name="orcamentoId"
                defaultValue={chamado?.orcamentoId ?? ""}
                className={SELECT_CLASSES}
              >
                <option value="">Nenhum</option>
                {orcamentos.map((o) => (
                  <option key={o.id} value={o.id}>
                    Orçamento {o.numero}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                É o que permite conferir se ainda está no prazo de garantia.
              </p>
            </div>
          )}

          {responsaveis.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="responsavelId">Responsável</Label>
              <select
                id="responsavelId"
                name="responsavelId"
                defaultValue={chamado?.responsavelId ?? ""}
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
            <Label htmlFor="descricao">O que o cliente relatou</Label>
            <Textarea
              id="descricao"
              name="descricao"
              rows={4}
              defaultValue={chamado?.descricao ?? ""}
            />
          </div>

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
