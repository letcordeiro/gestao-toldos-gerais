"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarCentavos, mascaraMoeda } from "@/lib/format";
import { PAPEL_INSTALADOR_LABEL, valorDaComissao } from "@/lib/comissoes";
import {
  adicionarNaEquipe,
  marcarComissaoPaga,
  removerDaEquipe,
  type EquipeFormState,
} from "./equipe-actions";

const SELECT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm";

export type LinhaEquipe = {
  id: number;
  instaladorId: number;
  instaladorNome: string;
  papel: "responsavel" | "ajudante";
  tipo: "percentual" | "fixo";
  percentual: number | null;
  valorFixo: number | null;
  pagoEm: Date | null;
};

export function EquipeInstalacao({
  orcamentoId,
  valorOrcamento,
  equipe,
  instaladores,
  editavel,
}: {
  orcamentoId: number;
  /** Soma dos itens do orçamento, em centavos. Base do percentual. */
  valorOrcamento: number | null;
  equipe: LinhaEquipe[];
  instaladores: {
    id: number;
    nome: string;
    comissaoPadraoPercent: number | null;
  }[];
  editavel: boolean;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"percentual" | "fixo">("percentual");
  const [instaladorId, setInstaladorId] = useState("");
  const [percentual, setPercentual] = useState("");
  const [valorFixo, setValorFixo] = useState("");
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState<EquipeFormState, FormData>(
    adicionarNaEquipe,
    {}
  );

  useEffect(() => {
    if (state.ok) {
      setInstaladorId("");
      setPercentual("");
      setValorFixo("");
      router.refresh();
    }
  }, [state, router]);

  // Escolher o instalador já traz a comissão padrão dele.
  function escolher(id: string) {
    setInstaladorId(id);
    const inst = instaladores.find((i) => String(i.id) === id);
    if (inst?.comissaoPadraoPercent != null) {
      setTipo("percentual");
      setPercentual(String(inst.comissaoPadraoPercent));
    }
  }

  const disponiveis = instaladores.filter(
    (i) => !equipe.some((e) => e.instaladorId === i.id)
  );

  const total = equipe.reduce((s, l) => {
    const v = valorDaComissao(l, valorOrcamento);
    return s + (v ?? 0);
  }, 0);
  const aPagar = equipe
    .filter((l) => !l.pagoEm)
    .reduce((s, l) => s + (valorDaComissao(l, valorOrcamento) ?? 0), 0);

  return (
    <div className="space-y-3">
      {equipe.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguém na equipe ainda.
        </p>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {equipe.map((l) => {
              const valor = valorDaComissao(l, valorOrcamento);
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{l.instaladorNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {PAPEL_INSTALADOR_LABEL[l.papel]} ·{" "}
                      {l.tipo === "percentual"
                        ? `${l.percentual}% do orçamento`
                        : "valor fixo"}
                      {l.pagoEm
                        ? ` · pago em ${l.pagoEm.toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">
                      {valor == null ? (
                        <span className="text-xs text-muted-foreground">
                          sem valor no orçamento
                        </span>
                      ) : (
                        formatarCentavos(valor)
                      )}
                    </span>
                    {editavel && (
                      <>
                        <Button
                          size="sm"
                          variant={l.pagoEm ? "ghost" : "outline"}
                          disabled={ocupado === l.id}
                          onClick={() => {
                            setOcupado(l.id);
                            startTransition(async () => {
                              await marcarComissaoPaga(l.id, !l.pagoEm);
                              router.refresh();
                              setOcupado(null);
                            });
                          }}
                        >
                          {l.pagoEm ? (
                            <>
                              <Undo2 className="size-4" /> Desfazer
                            </>
                          ) : (
                            <>
                              <Check className="size-4" /> Pago
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Remover ${l.instaladorNome}`}
                          disabled={ocupado === l.id}
                          onClick={() => {
                            setOcupado(l.id);
                            startTransition(async () => {
                              await removerDaEquipe(l.id);
                              router.refresh();
                              setOcupado(null);
                            });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-sm">
            <span className="text-muted-foreground">Comissão total: </span>
            <strong className="tabular-nums">{formatarCentavos(total)}</strong>
            {aPagar > 0 && (
              <>
                <span className="text-muted-foreground"> · a pagar: </span>
                <strong className="tabular-nums text-brand-orange-dark">
                  {formatarCentavos(aPagar)}
                </strong>
              </>
            )}
          </p>
        </>
      )}

      {editavel && disponiveis.length > 0 && (
        <form
          action={formAction}
          className="grid gap-2 rounded-lg border bg-secondary/40 p-3 sm:grid-cols-[1fr_120px_120px_auto]"
        >
          <input type="hidden" name="orcamentoId" value={orcamentoId} />
          <div className="space-y-1">
            <Label className="text-xs">Instalador</Label>
            <select
              name="instaladorId"
              value={instaladorId}
              onChange={(e) => escolher(e.target.value)}
              className={SELECT}
            >
              <option value="">Selecione…</option>
              {disponiveis.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Papel</Label>
            <select name="papel" defaultValue="ajudante" className={SELECT}>
              <option value="responsavel">Responsável</option>
              <option value="ajudante">Ajudante</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Comissão</Label>
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "percentual" | "fixo")}
              className={SELECT}
            >
              <option value="percentual">% do orçamento</option>
              <option value="fixo">Valor fixo</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              {tipo === "percentual" ? "%" : "R$"}
            </Label>
            {tipo === "percentual" ? (
              <Input
                name="percentual"
                inputMode="decimal"
                className="w-24 text-right tabular-nums"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
              />
            ) : (
              <Input
                name="valorFixo"
                inputMode="decimal"
                className="w-28 text-right tabular-nums"
                value={valorFixo}
                onChange={(e) => setValorFixo(mascaraMoeda(e.target.value))}
              />
            )}
          </div>
          <div className="sm:col-span-4">
            {state.erro && (
              <p className="mb-2 text-sm text-destructive">{state.erro}</p>
            )}
            <Button type="submit" size="sm" disabled={pending || !instaladorId}>
              {pending ? "Incluindo…" : "Incluir na equipe"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
