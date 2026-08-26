"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatarCentavos, mascaraMoeda, parseParaCentavos } from "@/lib/format";
import {
  MEIO_LABEL,
  PRESETS,
  validarPlanoPagamento,
  type GatilhoPagamento,
  type LinhaPagamento,
  type MeioPagamento,
  type PresetPlano,
  type TipoPagamento,
} from "@/lib/contratos";
import { aplicarPresetPlano, salvarPlanoPagamento } from "../actions";

const SELECT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const GATILHOS: { valor: GatilhoPagamento; rotulo: string }[] = [
  { valor: "assinatura", rotulo: "Na assinatura" },
  { valor: "inicio_fabricacao", rotulo: "No início da fabricação" },
  { valor: "entrega_material", rotulo: "Na entrega do material" },
  { valor: "conclusao_instalacao", rotulo: "Na conclusão da instalação" },
  { valor: "dias_apos_instalacao", rotulo: "Dias após a instalação" },
  { valor: "dias_apos_assinatura", rotulo: "Dias após a assinatura" },
  { valor: "data_fixa", rotulo: "Data fixa" },
];

const TIPOS: { valor: TipoPagamento; rotulo: string }[] = [
  { valor: "sinal", rotulo: "Sinal/entrada" },
  { valor: "parcela", rotulo: "Parcela" },
  { valor: "saldo", rotulo: "Saldo" },
];

const MEIOS = Object.keys(MEIO_LABEL) as MeioPagamento[];

export function PlanoPagamento({
  contratoId,
  valorTotal,
  linhasIniciais,
  editavel,
}: {
  contratoId: number;
  valorTotal: number;
  linhasIniciais: LinhaPagamento[];
  editavel: boolean;
}) {
  const [linhas, setLinhas] = useState<LinhaPagamento[]>(linhasIniciais);
  const [pending, startTransition] = useTransition();

  const validacao = validarPlanoPagamento(linhas, valorTotal);

  const alterar = (i: number, campo: keyof LinhaPagamento, valor: unknown) => {
    setLinhas((atual) =>
      atual.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l))
    );
  };

  const mover = (i: number, direcao: -1 | 1) => {
    const destino = i + direcao;
    if (destino < 0 || destino >= linhas.length) return;
    setLinhas((atual) => {
      const copia = [...atual];
      [copia[i], copia[destino]] = [copia[destino], copia[i]];
      return copia.map((l, idx) => ({ ...l, ordem: idx }));
    });
  };

  const adicionar = () => {
    setLinhas((atual) => [
      ...atual,
      {
        ordem: atual.length,
        rotulo: "Parcela",
        tipo: "parcela",
        valor: Math.max(0, valorTotal - atual.reduce((s, l) => s + l.valor, 0)),
        meio: "pix",
        numeroParcelas: 1,
        gatilho: "assinatura",
        diasApos: null,
        dataVencimento: null,
      },
    ]);
  };

  const remover = (i: number) => {
    setLinhas((atual) =>
      atual.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, ordem: idx }))
    );
  };

  const salvar = () => {
    // Normaliza o que ficou "vazio" enquanto digitava (0 em parcelas, null em dias).
    const normalizadas = linhas.map((l) => ({
      ...l,
      numeroParcelas: l.numeroParcelas < 1 ? 1 : l.numeroParcelas,
      diasApos:
        l.gatilho === "dias_apos_instalacao" ||
        l.gatilho === "dias_apos_assinatura"
          ? (l.diasApos ?? 0)
          : l.diasApos,
    }));
    setLinhas(normalizadas);
    startTransition(async () => {
      const r = await salvarPlanoPagamento(contratoId, normalizadas);
      if (r.erro) toast.error(r.erro);
      else toast.success("Plano de pagamento salvo");
    });
  };

  const usarPreset = (preset: PresetPlano) => {
    startTransition(async () => {
      const r = await aplicarPresetPlano(contratoId, preset);
      if (r.erro) {
        toast.error(r.erro);
        return;
      }
      // Reflete localmente sem esperar o reload do server component.
      const { gerarPreset } = await import("@/lib/contratos");
      setLinhas(gerarPreset(preset, valorTotal));
      toast.success("Preset aplicado");
    });
  };

  return (
    <div className="space-y-3">
      {editavel && (
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.chave}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              title={p.descricao}
              onClick={() => usarPreset(p.chave)}
            >
              {p.nome}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {linhas.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Nenhuma linha. Use um preset acima ou adicione manualmente.
          </p>
        )}
        {linhas.map((linha, i) => (
          <div key={i} className="space-y-2 rounded-lg border bg-card p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <div className="space-y-1">
                <Label htmlFor={`rotulo-${i}`} className="text-xs">
                  Rótulo
                </Label>
                <Input
                  id={`rotulo-${i}`}
                  value={linha.rotulo}
                  disabled={!editavel}
                  onChange={(e) => alterar(i, "rotulo", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`valor-${i}`} className="text-xs">
                  Valor
                </Label>
                <Input
                  id={`valor-${i}`}
                  inputMode="decimal"
                  className="w-32 text-right tabular-nums"
                  disabled={!editavel}
                  value={(linha.valor / 100).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  onChange={(e) => {
                    const mascarado = mascaraMoeda(e.target.value);
                    alterar(i, "valor", parseParaCentavos(mascarado) ?? 0);
                  }}
                />
              </div>
              {editavel && (
                <div className="flex items-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-10 sm:size-7"
                    aria-label="Subir linha"
                    disabled={i === 0}
                    onClick={() => mover(i, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-10 sm:size-7"
                    aria-label="Descer linha"
                    disabled={i === linhas.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover linha"
                    className="size-10 text-destructive sm:size-7"
                    onClick={() => remover(i)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor={`tipo-${i}`} className="text-xs">
                  Tipo
                </Label>
                <select
                  id={`tipo-${i}`}
                  className={SELECT}
                  value={linha.tipo}
                  disabled={!editavel}
                  onChange={(e) => alterar(i, "tipo", e.target.value)}
                >
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`meio-${i}`} className="text-xs">
                  Meio
                </Label>
                <select
                  id={`meio-${i}`}
                  className={SELECT}
                  value={linha.meio}
                  disabled={!editavel}
                  onChange={(e) => alterar(i, "meio", e.target.value)}
                >
                  {MEIOS.map((m) => (
                    <option key={m} value={m}>
                      {MEIO_LABEL[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`parcelas-${i}`} className="text-xs">
                  Parcelas
                </Label>
                <Input
                  id={`parcelas-${i}`}
                  type="number"
                  min={1}
                  max={48}
                  inputMode="numeric"
                  disabled={!editavel}
                  // 0 = campo vazio enquanto digita. Sem isso, apagar voltava
                  // para "1" e o próximo dígito grudava nele ("16").
                  value={linha.numeroParcelas === 0 ? "" : linha.numeroParcelas}
                  onChange={(e) => {
                    const texto = e.target.value;
                    alterar(i, "numeroParcelas", texto === "" ? 0 : Number(texto));
                  }}
                  // Ao sair do campo, vazio vira 1 (mínimo válido).
                  onBlur={() => {
                    if (linha.numeroParcelas < 1) alterar(i, "numeroParcelas", 1);
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`gatilho-${i}`} className="text-xs">
                  Quando vence
                </Label>
                <select
                  id={`gatilho-${i}`}
                  className={SELECT}
                  value={linha.gatilho}
                  disabled={!editavel}
                  onChange={(e) => alterar(i, "gatilho", e.target.value)}
                >
                  {GATILHOS.map((g) => (
                    <option key={g.valor} value={g.valor}>
                      {g.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              {(linha.gatilho === "dias_apos_instalacao" ||
                linha.gatilho === "dias_apos_assinatura") && (
                <div className="space-y-1">
                  <Label htmlFor={`dias-${i}`} className="text-xs">
                    {linha.gatilho === "dias_apos_assinatura"
                      ? "Dias após a assinatura"
                      : "Dias após a instalação"}
                  </Label>
                  <Input
                    id={`dias-${i}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    disabled={!editavel}
                    // null = vazio enquanto digita (mesmo motivo das parcelas).
                    value={linha.diasApos ?? ""}
                    onChange={(e) => {
                      const texto = e.target.value;
                      alterar(i, "diasApos", texto === "" ? null : Number(texto));
                    }}
                    onBlur={() => {
                      if (linha.diasApos == null) alterar(i, "diasApos", 0);
                    }}
                  />
                </div>
              )}
              {linha.gatilho === "data_fixa" && (
                <div className="space-y-1">
                  <Label htmlFor={`venc-${i}`} className="text-xs">
                    Vencimento
                  </Label>
                  <Input
                    id={`venc-${i}`}
                    type="date"
                    disabled={!editavel}
                    value={linha.dataVencimento ?? ""}
                    onChange={(e) =>
                      alterar(i, "dataVencimento", e.target.value || null)
                    }
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totalizador sempre visível: soma das linhas × valor total */}
      <div
        className={cn(
          "sticky bottom-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm",
          validacao.ok
            ? "border-primary/40 bg-primary/5"
            : "border-destructive bg-destructive/10"
        )}
        role="status"
        aria-live="polite"
      >
        <span>
          Soma das linhas:{" "}
          <strong className="tabular-nums">
            {formatarCentavos(validacao.soma)}
          </strong>{" "}
          · Valor do contrato:{" "}
          <strong className="tabular-nums">
            {formatarCentavos(valorTotal)}
          </strong>
        </span>
        <span
          className={cn(
            "font-semibold",
            validacao.ok ? "text-primary" : "text-destructive"
          )}
        >
          {validacao.ok
            ? "Confere"
            : `${validacao.diferenca > 0 ? "Sobra" : "Falta"} ${formatarCentavos(
                Math.abs(validacao.diferenca)
              )}`}
        </span>
      </div>

      {editavel && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={adicionar}>
            <Plus className="size-4" /> Adicionar linha
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={salvar}>
            {pending ? "Salvando…" : "Salvar plano"}
          </Button>
        </div>
      )}
    </div>
  );
}
