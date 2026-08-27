"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  motivosDePerdaAtivos,
  mudarFase,
  orcamentosParaAprovar,
} from "@/app/(app)/atendimentos/actions";

type Fase = {
  id: number;
  nome: string;
  cor: string;
  liberaInstalacao?: boolean;
  ehPerdido?: boolean;
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
  const router = useRouter();
  // Estado próprio em vez de useTransition: com try/finally o seletor SEMPRE
  // destrava, mesmo se a gravação falhar. Era essa a queixa — ficava travado
  // e só recarregando a página voltava ao normal.
  const [salvando, setSalvando] = useState(false);
  const [pergunta, setPergunta] = useState<{
    faseId: number;
    opcoes: OrcamentoOpcao[];
    escolhidos: number[];
  } | null>(null);
  // Perguntar o motivo é o que faz o relatório de perdas existir: sem isso o
  // negócio some do funil sem deixar rastro do porquê.
  const [perda, setPerda] = useState<{
    faseId: number;
    motivos: { id: number; nome: string }[];
    motivoId: number | null;
    observacao: string;
  } | null>(null);

  const faseAtual = fases.find((f) => f.id === faseId);
  const cor = faseAtual?.cor;

  async function aplicar(
    novaFaseId: number,
    orcamentoIds?: number[],
    dadosPerda?: { motivoId: number | null; observacao: string }
  ) {
    setSalvando(true);
    try {
      await mudarFase(atendimentoId, novaFaseId, orcamentoIds, dadosPerda);
      // Atualiza a tela sem depender de recarregar na mão.
      router.refresh();
    } catch {
      toast.error("Não deu para mudar a fase. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function escolher(valor: string | null) {
    if (!valor || valor === String(faseId)) return;
    const novaFaseId = Number(valor);
    const fase = fases.find((f) => f.id === novaFaseId);

    setSalvando(true);
    try {
      // Fase de negócio perdido: para antes de gravar e pergunta o motivo.
      if (fase?.ehPerdido) {
        const motivos = await motivosDePerdaAtivos().catch(
          () => [] as { id: number; nome: string }[]
        );
        setPerda({
          faseId: novaFaseId,
          motivos,
          motivoId: null,
          observacao: "",
        });
        return;
      }
      // Fase que fecha negócio: se houver mais de um orçamento aguardando,
      // perguntamos qual foi o aprovado em vez de decidir por conta própria.
      if (fase?.liberaInstalacao) {
        const opcoes = await orcamentosParaAprovar(atendimentoId).catch(
          () => [] as OrcamentoOpcao[]
        );
        if (opcoes.length > 1) {
          setPergunta({ faseId: novaFaseId, opcoes, escolhidos: [] });
          return;
        }
      }
      await mudarFase(atendimentoId, novaFaseId);
      router.refresh();
    } catch {
      toast.error("Não deu para mudar a fase. Tente de novo.");
    } finally {
      setSalvando(false);
    }
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
        disabled={salvando}
        items={fases.map((f) => ({ value: String(f.id), label: f.nome }))}
        onValueChange={escolher}
      >
        {/* O gatilho fica na cor definida para a fase selecionada. */}
        <SelectTrigger
          aria-label="Status do atendimento"
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

      <Dialog
        open={perda != null}
        onOpenChange={(aberto) => {
          if (!aberto) setPerda(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Por que o negócio foi perdido?</DialogTitle>
            <DialogDescription>
              Fica no relatório de perdas. Se ainda não souber, dá para marcar
              sem motivo e voltar aqui depois.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {perda?.motivos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum motivo cadastrado ainda. Cadastre em Configurações →
                Motivos de perda.
              </p>
            )}
            {perda?.motivos.map((m) => {
              const marcado = perda.motivoId === m.id;
              return (
                <label
                  key={m.id}
                  className={
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors " +
                    (marcado ? "border-primary bg-primary/5" : "hover:bg-secondary")
                  }
                >
                  <input
                    type="radio"
                    name="motivo-perda"
                    checked={marcado}
                    onChange={() =>
                      setPerda((p) => (p ? { ...p, motivoId: m.id } : p))
                    }
                    className="size-4"
                  />
                  <span className="text-sm font-medium">{m.nome}</span>
                </label>
              );
            })}
            <Textarea
              rows={2}
              placeholder="Detalhe (opcional) — ex.: fechou com o concorrente por R$ 800 a menos"
              value={perda?.observacao ?? ""}
              onChange={(e) =>
                setPerda((p) => (p ? { ...p, observacao: e.target.value } : p))
              }
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPerda(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!perda) return;
                aplicar(perda.faseId, undefined, {
                  motivoId: perda.motivoId,
                  observacao: perda.observacao,
                });
                setPerda(null);
              }}
            >
              Marcar como perdido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
