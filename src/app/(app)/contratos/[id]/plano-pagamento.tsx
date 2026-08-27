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
  validarPlanoPercentual,
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

// O que o gerador manda para a action (subconjunto de OpcoesPreset).
type OpcoesPresetUI = {
  entradaPercent?: number;
  parcelas?: number;
  intervaloDias?: number;
  dataBase?: string;
  meio?: MeioPagamento;
};

export function PlanoPagamento({
  contratoId,
  valorTotal,
  linhasIniciais,
  editavel,
  modoOpcoes = false,
}: {
  contratoId: number;
  valorTotal: number;
  linhasIniciais: LinhaPagamento[];
  editavel: boolean;
  /** Contrato com opções de preço: as linhas são percentuais e somam 100%. */
  modoOpcoes?: boolean;
}) {
  const [linhas, setLinhas] = useState<LinhaPagamento[]>(linhasIniciais);
  const [pending, startTransition] = useTransition();
  // Painel do gerador "N parcelas a cada X dias" — só abre quando pedido.
  const [gerador, setGerador] = useState<{
    parcelas: number;
    intervaloDias: number;
    dataBase: string;
    meio: MeioPagamento;
  } | null>(null);

  const validacaoValor = validarPlanoPagamento(linhas, valorTotal);
  const validacaoPercent = validarPlanoPercentual(linhas);
  const validacao = modoOpcoes ? validacaoPercent : validacaoValor;
  const somaPercent = validacaoPercent.soma;

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
        // A linha nova já nasce fechando o que falta — em reais ou em %.
        valor: modoOpcoes
          ? 0
          : Math.max(0, valorTotal - atual.reduce((s, l) => s + l.valor, 0)),
        percentual: modoOpcoes
          ? Math.max(
              0,
              Math.round(
                (100 - atual.reduce((s, l) => s + (l.percentual ?? 0), 0)) * 100
              ) / 100
            )
          : null,
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

  const usarPreset = (preset: PresetPlano, opcoes: OpcoesPresetUI = {}) => {
    startTransition(async () => {
      const r = await aplicarPresetPlano(contratoId, preset, opcoes);
      if (r.erro) {
        toast.error(r.erro);
        return;
      }
      // Reflete localmente sem esperar o reload do server component.
      const { gerarPreset, gerarPresetPercentual } = await import(
        "@/lib/contratos"
      );
      setLinhas(
        modoOpcoes
          ? gerarPresetPercentual(preset, opcoes)
          : gerarPreset(preset, valorTotal, opcoes)
      );
      setGerador(null);
      toast.success("Plano gerado");
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
              onClick={() =>
                p.chave === "intervalo_dias"
                  ? setGerador((g) =>
                      g
                        ? null
                        : {
                            parcelas: 3,
                            intervaloDias: 30,
                            dataBase: new Date().toISOString().slice(0, 10),
                            meio: "pix",
                          }
                    )
                  : usarPreset(p.chave)
              }
            >
              {p.nome}
            </Button>
          ))}
        </div>
      )}

      {editavel && gerador && (
        <div className="space-y-3 rounded-lg border bg-secondary/40 p-3">
          <p className="text-sm font-medium">
            Gerar parcelas com data fixa
            <span className="ml-2 font-normal text-muted-foreground">
              divide o total em partes iguais
            </span>
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="ger-parcelas" className="text-xs">
                Parcelas
              </Label>
              <Input
                id="ger-parcelas"
                type="number"
                min={1}
                max={60}
                value={gerador.parcelas}
                onChange={(e) =>
                  setGerador((g) =>
                    g ? { ...g, parcelas: Number(e.target.value) } : g
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ger-intervalo" className="text-xs">
                A cada (dias)
              </Label>
              <Input
                id="ger-intervalo"
                type="number"
                min={1}
                max={365}
                value={gerador.intervaloDias}
                onChange={(e) =>
                  setGerador((g) =>
                    g ? { ...g, intervaloDias: Number(e.target.value) } : g
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ger-data" className="text-xs">
                1ª parcela em
              </Label>
              <Input
                id="ger-data"
                type="date"
                value={gerador.dataBase}
                onChange={(e) =>
                  setGerador((g) =>
                    g ? { ...g, dataBase: e.target.value } : g
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ger-meio" className="text-xs">
                Meio
              </Label>
              <select
                id="ger-meio"
                className={SELECT}
                value={gerador.meio}
                onChange={(e) =>
                  setGerador((g) =>
                    g ? { ...g, meio: e.target.value as MeioPagamento } : g
                  )
                }
              >
                {MEIOS.map((m) => (
                  <option key={m} value={m}>
                    {MEIO_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                usarPreset("intervalo_dias", {
                  parcelas: gerador.parcelas,
                  intervaloDias: gerador.intervaloDias,
                  dataBase: gerador.dataBase,
                  meio: gerador.meio,
                })
              }
            >
              Gerar {gerador.parcelas} parcela
              {gerador.parcelas > 1 ? "s" : ""}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setGerador(null)}
            >
              Cancelar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Substitui o plano atual. Depois dá para ajustar cada linha na mão.
          </p>
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
                  {modoOpcoes ? "% do valor" : "Valor"}
                </Label>
                {modoOpcoes ? (
                  <Input
                    id={`valor-${i}`}
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    inputMode="decimal"
                    className="w-32 text-right tabular-nums"
                    disabled={!editavel}
                    // vazio enquanto digita, como nas parcelas
                    value={linha.percentual ?? ""}
                    onChange={(e) => {
                      const texto = e.target.value;
                      alterar(
                        i,
                        "percentual",
                        texto === "" ? null : Number(texto)
                      );
                    }}
                    onBlur={() => {
                      if (linha.percentual == null) alterar(i, "percentual", 0);
                    }}
                  />
                ) : (
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
                )}
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
        {modoOpcoes ? (
          <span>
            Soma dos percentuais:{" "}
            <strong className="tabular-nums">{somaPercent}%</strong> · precisa
            fechar <strong className="tabular-nums">100%</strong>
          </span>
        ) : (
          <span>
            Soma das linhas:{" "}
            <strong className="tabular-nums">
              {formatarCentavos(validacaoValor.soma)}
            </strong>{" "}
            · Valor do contrato:{" "}
            <strong className="tabular-nums">
              {formatarCentavos(valorTotal)}
            </strong>
          </span>
        )}
        <span
          className={cn(
            "font-semibold",
            validacao.ok ? "text-primary" : "text-destructive"
          )}
        >
          {validacao.ok
            ? "Confere"
            : modoOpcoes
              ? `${somaPercent > 100 ? "Sobra" : "Falta"} ${
                  Math.round(Math.abs(100 - somaPercent) * 100) / 100
                }%`
              : `${
                  validacaoValor.diferenca > 0 ? "Sobra" : "Falta"
                } ${formatarCentavos(Math.abs(validacaoValor.diferenca))}`}
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
