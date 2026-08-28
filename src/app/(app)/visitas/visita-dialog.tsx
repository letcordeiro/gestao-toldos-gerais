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
import {
  enderecoDoAtendimento,
  salvarVisita,
  type VisitaFormState,
} from "./actions";

const SELECT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm";

export type VisitaEdicao = {
  id: number;
  inicioEm: Date;
  duracaoMin: number;
  endereco: string | null;
  observacoes: string | null;
  vendedorId: number | null;
};

/** Date → "2026-09-01T09:00", que é o formato do input datetime-local. */
function paraInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function VisitaDialog({
  visita,
  atendimentoId,
  responsaveis = [],
  trigger,
}: {
  visita?: VisitaEdicao;
  atendimentoId: number;
  responsaveis?: { id: number; nome: string }[];
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [endereco, setEndereco] = useState(visita?.endereco ?? "");
  const [state, formAction, pending] = useActionState<VisitaFormState, FormData>(
    salvarVisita,
    {}
  );

  useEffect(() => {
    if (state.ok) {
      setAberto(false);
      router.refresh();
    }
  }, [state, router]);

  // Ao abrir para uma visita nova, já traz o endereço do cliente — quase
  // sempre é onde a visita acontece, e digitar de novo só gera erro.
  useEffect(() => {
    if (aberto && !visita && endereco === "") {
      enderecoDoAtendimento(atendimentoId)
        .then((e) => setEndereco(e))
        .catch(() => {});
    }
  }, [aberto, visita, atendimentoId, endereco]);

  // Padrão de horário: amanhã às 9h, arredondado — quase nunca se marca visita
  // para daqui a cinco minutos.
  const padrao = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return paraInput(d);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {visita ? "Editar visita" : "Agendar visita"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {visita && <input type="hidden" name="id" value={visita.id} />}
          <input type="hidden" name="atendimentoId" value={atendimentoId} />

          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1.5">
              <Label htmlFor="inicio">Quando *</Label>
              <Input
                id="inicio"
                name="inicio"
                type="datetime-local"
                defaultValue={visita ? paraInput(visita.inicioEm) : padrao()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duracaoMin">Duração (min)</Label>
              <Input
                id="duracaoMin"
                name="duracaoMin"
                type="number"
                min={15}
                max={600}
                step={15}
                defaultValue={visita?.duracaoMin ?? 60}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endereco">Endereço da visita</Label>
            <Input
              id="endereco"
              name="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Onde a equipe vai"
            />
            <p className="text-xs text-muted-foreground">
              Vem do cadastro do cliente, mas dá para trocar: a obra costuma
              ser em outro endereço. É este que entra na rota do dia.
            </p>
          </div>

          {responsaveis.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="vendedorId">Quem vai</Label>
              <select
                id="vendedorId"
                name="vendedorId"
                defaultValue={visita?.vendedorId ?? ""}
                className={SELECT}
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
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={2}
              defaultValue={visita?.observacoes ?? ""}
              placeholder="Ponto de referência, com quem falar, o que levar…"
            />
          </div>

          {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
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
