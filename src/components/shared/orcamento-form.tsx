"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { mascaraMoeda } from "@/lib/format";
import {
  atualizarOrcamento,
  criarOrcamento,
  type OrcamentoFormState,
} from "@/app/(app)/orcamentos/actions";

type AtendimentoOpcao = {
  id: number;
  clienteNome: string;
  clienteTelefone: string;
};

type Modelo = {
  id: number;
  nome: string;
  descricaoMaterial: string | null;
  fixacaoVedacao: string | null;
  estruturaSempreAluminio: boolean;
  usaFormato: boolean;
};

type VendedorOpcao = { id: number; nome: string };

type TipoEstrutura = "aluminio" | "metalica";
type Formato = "capotinha" | "braco_retratil" | "";

type Item = {
  descricao: string;
  valorMin: string;
  valorMax: string;
  subtitulo: boolean;
};

// Valores iniciais ao editar um orçamento existente (já em reais formatados)
export type OrcamentoInicial = {
  id: number;
  atendimentoId: number;
  modeloId: number | null;
  vendedorId: number | null;
  tipoEstrutura: TipoEstrutura;
  formato: Formato;
  descricaoMaterial: string;
  fixacaoVedacao: string;
  garantiaTexto: string;
  formaPagamento: string;
  prazoEntrega: string;
  itens: Item[];
};

const ITEM_VAZIO: Item = {
  descricao: "",
  valorMin: "",
  valorMax: "",
  subtitulo: false,
};

export function OrcamentoForm({
  atendimentos,
  modelos,
  vendedores,
  atendimentoInicial,
  padroes,
  orcamento,
}: {
  atendimentos: AtendimentoOpcao[];
  modelos: Modelo[];
  vendedores: VendedorOpcao[];
  atendimentoInicial?: string;
  padroes: { garantia: string; formaPagamento: string; prazoEntrega: string };
  orcamento?: OrcamentoInicial;
}) {
  const edicao = Boolean(orcamento);
  const [state, formAction, pending] = useActionState<
    OrcamentoFormState,
    FormData
  >(edicao ? atualizarOrcamento : criarOrcamento, {});

  const [atendimentoId, setAtendimentoId] = useState(
    orcamento ? String(orcamento.atendimentoId) : atendimentoInicial ?? ""
  );
  const [vendedorId, setVendedorId] = useState(
    orcamento?.vendedorId
      ? String(orcamento.vendedorId)
      : vendedores[0]
        ? String(vendedores[0].id)
        : ""
  );
  const [modeloId, setModeloId] = useState(
    orcamento?.modeloId ? String(orcamento.modeloId) : ""
  );
  const [tipoEstrutura, setTipoEstrutura] = useState<TipoEstrutura>(
    orcamento?.tipoEstrutura ?? "aluminio"
  );
  const [formato, setFormato] = useState<Formato>(orcamento?.formato ?? "");
  const [descricaoMaterial, setDescricaoMaterial] = useState(
    orcamento?.descricaoMaterial ?? ""
  );
  const [fixacaoVedacao, setFixacaoVedacao] = useState(
    orcamento?.fixacaoVedacao ?? ""
  );
  const [itens, setItens] = useState<Item[]>(
    orcamento && orcamento.itens.length > 0
      ? orcamento.itens
      : [{ ...ITEM_VAZIO }]
  );

  const modeloSelecionado = modelos.find((m) => String(m.id) === modeloId);
  const estruturaFixaAluminio = modeloSelecionado?.estruturaSempreAluminio;
  const usaFormato = modeloSelecionado?.usaFormato ?? false;
  const tipoEstruturaEfetivo: TipoEstrutura = estruturaFixaAluminio
    ? "aluminio"
    : tipoEstrutura;

  function aoTrocarModelo(id: string) {
    setModeloId(id);
    const modelo = modelos.find((m) => String(m.id) === id);
    if (!modelo) return;
    setDescricaoMaterial(modelo.descricaoMaterial ?? "");
    setFixacaoVedacao(modelo.fixacaoVedacao ?? "");
    if (modelo.estruturaSempreAluminio) setTipoEstrutura("aluminio");
    // Formato só existe em modelos que usam (ex.: Toldos Italianos)
    setFormato(modelo.usaFormato ? formato || "capotinha" : "");
  }

  function atualizarItem(indice: number, mudanca: Partial<Item>) {
    setItens((atual) =>
      atual.map((item, i) => (i === indice ? { ...item, ...mudanca } : item))
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {orcamento && (
        <input type="hidden" name="orcamentoId" value={orcamento.id} />
      )}
      <input type="hidden" name="atendimentoId" value={atendimentoId} />
      <input type="hidden" name="vendedorId" value={vendedorId} />
      <input type="hidden" name="modeloId" value={modeloId} />
      <input type="hidden" name="tipoEstrutura" value={tipoEstruturaEfetivo} />
      <input type="hidden" name="formato" value={usaFormato ? formato : ""} />
      <input
        type="hidden"
        name="itens"
        value={JSON.stringify(
          itens.filter((item) => item.descricao.trim() !== "")
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atendimento e modelo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Atendimento / cliente *</Label>
              <Select
                value={atendimentoId || null}
                items={atendimentos.map((a) => ({
                  value: String(a.id),
                  label: `${a.clienteNome} — ${a.clienteTelefone}`,
                }))}
                onValueChange={(v) => setAtendimentoId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha o atendimento" />
                </SelectTrigger>
                <SelectContent>
                  {atendimentos.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.clienteNome} — {a.clienteTelefone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Vendedor responsável</Label>
              <Select
                value={vendedorId || null}
                items={vendedores.map((v) => ({
                  value: String(v.id),
                  label: v.nome,
                }))}
                onValueChange={(v) => setVendedorId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Modelo do toldo</Label>
              <Select
                value={modeloId || null}
                items={modelos.map((m) => ({
                  value: String(m.id),
                  label: m.nome,
                }))}
                onValueChange={(v) => aoTrocarModelo(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modelos.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de estrutura</Label>
              {estruturaFixaAluminio ? (
                <p className="pt-2 text-sm">
                  Alumínio{" "}
                  <span className="text-muted-foreground">
                    (fixo para este modelo)
                  </span>
                </p>
              ) : (
                <RadioGroup
                  value={tipoEstrutura}
                  onValueChange={(v) =>
                    setTipoEstrutura((v ?? "aluminio") as TipoEstrutura)
                  }
                  className="flex gap-4 pt-1.5"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="aluminio" /> Alumínio
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="metalica" /> Metálica
                  </label>
                </RadioGroup>
              )}
            </div>
          </div>
          {usaFormato && (
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <RadioGroup
                value={formato || "capotinha"}
                onValueChange={(v) =>
                  setFormato((v ?? "capotinha") as Formato)
                }
                className="flex gap-4 pt-1.5"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="capotinha" /> Capotinha
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="braco_retratil" /> Braço Retrátil
                </label>
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Textos da proposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="descricaoMaterial">Descrição do material</Label>
            <Textarea
              id="descricaoMaterial"
              name="descricaoMaterial"
              rows={3}
              value={descricaoMaterial}
              onChange={(e) => setDescricaoMaterial(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fixacaoVedacao">
              Fixação e vedação da estrutura
            </Label>
            <Textarea
              id="fixacaoVedacao"
              name="fixacaoVedacao"
              rows={3}
              value={fixacaoVedacao}
              onChange={(e) => setFixacaoVedacao(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="garantiaTexto">Garantia</Label>
            <Textarea
              id="garantiaTexto"
              name="garantiaTexto"
              rows={2}
              defaultValue={orcamento?.garantiaTexto ?? padroes.garantia}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="formaPagamento">Forma de pagamento</Label>
              <Textarea
                id="formaPagamento"
                name="formaPagamento"
                rows={2}
                defaultValue={
                  orcamento?.formaPagamento ?? padroes.formaPagamento
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prazoEntrega">Prazo de entrega</Label>
              <Textarea
                id="prazoEntrega"
                name="prazoEntrega"
                rows={2}
                defaultValue={orcamento?.prazoEntrega ?? padroes.prazoEntrega}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Valor do orçamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {itens.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[1fr_120px_120px_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {item.subtitulo ? "Subtítulo" : `Item ${i + 1}`}
                </Label>
                <Input
                  value={item.descricao}
                  placeholder={
                    item.subtitulo
                      ? "ex.: valores referente à troca de lona"
                      : "Descrição do item"
                  }
                  onChange={(e) =>
                    atualizarItem(i, { descricao: e.target.value })
                  }
                />
              </div>
              {!item.subtitulo && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Valor (R$)
                    </Label>
                    <Input
                      value={item.valorMin}
                      placeholder="0,00"
                      inputMode="numeric"
                      onChange={(e) =>
                        atualizarItem(i, {
                          valorMin: mascaraMoeda(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Até (opcional)
                    </Label>
                    <Input
                      value={item.valorMax}
                      placeholder="faixa"
                      inputMode="numeric"
                      onChange={(e) =>
                        atualizarItem(i, {
                          valorMax: mascaraMoeda(e.target.value),
                        })
                      }
                    />
                  </div>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() =>
                  setItens((atual) => atual.filter((_, j) => j !== i))
                }
              >
                Remover
              </Button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItens((atual) => [...atual, { ...ITEM_VAZIO }])}
            >
              + Item
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItens((atual) => [
                  ...atual,
                  { ...ITEM_VAZIO, subtitulo: true },
                ])
              }
            >
              + Subtítulo
            </Button>
          </div>
        </CardContent>
      </Card>

      {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="status"
          value="rascunho"
          variant="secondary"
          disabled={pending}
        >
          Salvar rascunho
        </Button>
        <Button type="submit" name="status" value="enviado" disabled={pending}>
          {pending ? "Salvando…" : "Salvar como enviado"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        “Salvar como enviado” move o atendimento para a fase “Orçamento
        enviado”.
      </p>
    </form>
  );
}
