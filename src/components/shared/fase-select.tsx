"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatarCentavos } from "@/lib/format";
import {
  mudarFase,
  orcamentosParaAprovar,
} from "@/app/(app)/atendimentos/actions";

type Fase = {
  id: number;
  nome: string;
  cor: string;
  liberaInstalacao?: boolean;
};
type OrcamentoOpcao = { id: number; numero: string; total: number | null };

export function FaseSelect({
  atendimentoId,
  faseId,
  fases,
}: {
  atendimentoId: number;
  faseId: number;
  fases: Fase[];
}) {
  const [pending, startTransition] = useTransition();
  const [carregando, setCarregando] = useState(false);
  const [pergunta, setPergunta] = useState<{
    faseId: number;
    opcoes: OrcamentoOpcao[];
    escolhidos: number[];
  } | null>(null);

  const faseAtual = fases.find((f) => f.id === faseId);
  const cor = faseAtual?.cor;

  function aplicar(novaFaseId: number, orcamentoIds?: number[]) {
    startTransition(() => mudarFase(atendimentoId, novaFaseId, orcamentoIds));
  }

  async function escolher(valor: string | null) {
    if (!valor || valor === String(faseId)) return;
    const novaFaseId = Number(valor);
    const fase = fases.find((f) => f.id === novaFaseId);

    // Fase que fecha negócio: se houver mais de um orçamento aguardando,
    // perguntamos qual foi o aprovado em vez de aprovar todos por conta própria.
    if (fase?.liberaInstalacao) {
      setCarregando(true);
      try {
        const opcoes = await orcamentosParaAprovar(atendimentoId);
        if (opcoes.length > 1) {
          setPergunta({
            faseId: novaFaseId,
            opcoes,
            escolhidos: [],
          });
          return;
        }
      } finally {
        setCarregando(false);
      }
    }
    aplicar(novaFaseId);
  }

  function alternar(id: number) {
    setPergunta((p) =>
      p
        ? {
            ...p,
            escolhidos: p.escolhidos.includes(id)
              ? p.escolhidos.filter((x) => x !== id)
              : [...p.escolhidos, id],
          }
        : p
    );
  }

  const todosMarcados =
    pergunta != null &&
    pergunta.opcoes.length > 0 &&
    pergunta.escolhidos.length === pergunta.opcoes.length;

  return (
    <>
      <Select
        value={String(faseId)}
        disabled={pending || carregando}
        items={fases.map((f) => ({ value: String(f.id), label: f.nome }))}
        onValueChange={escolher}
      >
        {/* O gatilho fica na cor definida para a fase selecionada. */}
        <SelectTrigger
          className="w-[200px] font-medium"
          style={
            cor
              ? {
                  backgroundColor: `${cor}1a`,
                  borderColor: `${cor}80`,
                  color: cor,
                }
              : undefined
          }
        >
          <span className="flex items-center gap-2">
            {cor && (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: cor }}
              />
            )}
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {fases.map((fase) => (
            <SelectItem key={fase.id} value={String(fase.id)}>
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: fase.cor }}
              />
              {fase.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog
        open={pergunta != null}
        onOpenChange={(aberto) => {
          if (!aberto) setPergunta(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Qual orçamento o cliente aprovou?</DialogTitle>
            <DialogDescription>
              Este atendimento tem mais de um orçamento aguardando resposta.
              Marque o que foi fechado — os outros continuam como estão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {pergunta?.opcoes.map((o) => {
              const marcado = pergunta.escolhidos.includes(o.id);
              return (
                <label
                  key={o.id}
                  className={
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors " +
                    (marcado
                      ? "border-primary bg-primary/5"
                      : "hover:bg-secondary")
                  }
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternar(o.id)}
                      className="size-4"
                    />
                    <span className="font-medium">{o.numero}</span>
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {o.total != null ? formatarCentavos(o.total) : "sem valor"}
                  </span>
                </label>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setPergunta((p) =>
                  p
                    ? {
                        ...p,
                        escolhidos: todosMarcados
                          ? []
                          : p.opcoes.map((o) => o.id),
                      }
                    : p
                )
              }
            >
              {todosMarcados ? "Desmarcar todos" : "Marcar todos"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPergunta(null)}>
                Cancelar
              </Button>
              <Button
                disabled={!pergunta?.escolhidos.length}
                onClick={() => {
                  if (!pergunta) return;
                  aplicar(pergunta.faseId, pergunta.escolhidos);
                  setPergunta(null);
                }}
              >
                Aprovar {pergunta?.escolhidos.length || ""}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
