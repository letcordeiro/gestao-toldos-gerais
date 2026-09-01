"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
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
import { SeletorCliente } from "@/components/shared/seletor-cliente";
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
  introducao: string;
  aosCuidadosDe: string;
  validadeDias: string;
  observacoesInternas: string;
  itens: Item[];
};

// Subtítulos não entram na contagem: "Item 1, Item 2" continua seguido mesmo
// com um subtítulo no meio da lista.
function numeroDoItem(itens: Item[], indice: number): number {
  return itens.slice(0, indice + 1).filter((it) => !it.subtitulo).length;
}

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
  vendedorPadrao,
  vendedorFixo,
  atendimentoInicial,
  padroes,
  orcamento,
}: {
  atendimentos: AtendimentoOpcao[];
  modelos: Modelo[];
  vendedores: VendedorOpcao[];
  vendedorPadrao?: number;
  // Vendedor responsável travado no login (esconde o seletor).
  vendedorFixo?: { id: number; nome: string };
  atendimentoInicial?: string;
  padroes: { garantia: string; formaPagamento: string; prazoEntrega: string };
  orcamento?: OrcamentoInicial;
}) {
  const edicao = Boolean(orcamento);
  const [fotosCount, setFotosCount] = useState(0);
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
      : vendedorFixo
        ? String(vendedorFixo.id)
        : vendedorPadrao
          ? String(vendedorPadrao)
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

  // Troca a linha de lugar. A ordem daqui é a ordem que sai na proposta e no
  // PDF — é o que permite deixar um subtítulo logo abaixo do título da seção.
  function moverItem(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    setItens((atual) => {
      if (destino < 0 || destino >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
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
              <Label htmlFor="escolhaAtendimento">Atendimento / cliente *</Label>
              <SeletorCliente
                id="escolhaAtendimento"
                opcoes={atendimentos}
                valor={atendimentoId}
                onValorChange={setAtendimentoId}
                placeholder="Digite o nome do cliente"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vendedor responsável</Label>
              {vendedorFixo ? (
                <p className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                  {vendedorFixo.nome}
                </p>
              ) : (
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
              )}
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
            <Label htmlFor="introducao">Introdução</Label>
            <Textarea
              id="introducao"
              name="introducao"
              rows={2}
              defaultValue={orcamento?.introducao ?? ""}
              placeholder="Abre a proposta, antes do MODELO. Deixe em branco para começar direto."
            />
          </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="validadeDias">Validade da proposta</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="validadeDias"
                  name="validadeDias"
                  type="number"
                  min={0}
                  max={365}
                  className="w-24"
                  defaultValue={orcamento?.validadeDias ?? "15"}
                />
                <span className="text-sm text-muted-foreground">
                  dias — em branco, a proposta sai sem prazo
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aosCuidadosDe">Aos cuidados de</Label>
              <Input
                id="aosCuidadosDe"
                name="aosCuidadosDe"
                defaultValue={orcamento?.aosCuidadosDe ?? ""}
                placeholder="Em branco, usa o nome do cliente"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anotação interna</CardTitle>
          <p className="text-sm text-muted-foreground">
            Só a equipe vê. Não entra no PDF nem no link do cliente.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            id="observacoesInternas"
            name="observacoesInternas"
            rows={3}
            defaultValue={orcamento?.observacoesInternas ?? ""}
            placeholder="Ex.: cliente pediu desconto; João foi medir e o vão tem 3,20 m"
          />
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
                  {item.subtitulo
                    ? "Subtítulo"
                    : `Item ${numeroDoItem(itens, i)}`}
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
              <div className="flex items-center gap-0.5">
                {/* Ordem das linhas: é assim que um subtítulo vai parar logo
                    abaixo do título "Valor do orçamento" ou entre grupos. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  // 40px no toque: com 28px o dedo erra a seta no celular.
                  className="size-10 sm:size-7"
                  aria-label="Subir item"
                  title="Subir"
                  disabled={i === 0}
                  onClick={() => moverItem(i, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-10 sm:size-7"
                  aria-label="Descer item"
                  title="Descer"
                  disabled={i === itens.length - 1}
                  onClick={() => moverItem(i, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
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
              // Entra no TOPO: o uso comum é uma observação que vale para
              // todos os itens ("medidas consideradas: 3,20 × 1,50"), que deve
              // sair logo abaixo do título "Valor do orçamento". Para usar como
              // separador entre grupos, é só descer com as setas.
              onClick={() =>
                setItens((atual) => [
                  { ...ITEM_VAZIO, subtitulo: true },
                  ...atual,
                ])
              }
            >
              + Subtítulo
            </Button>
          </div>
        </CardContent>
      </Card>

      {!edicao && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fotos (opcional)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Anexe imagens agora — elas entram no PDF e no link que o cliente
              recebe. Você também pode adicionar depois, no orçamento salvo.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-secondary">
                  Escolher imagens
                </span>
                <input
                  type="file"
                  name="fotosNovas"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => setFotosCount(e.target.files?.length ?? 0)}
                />
              </label>
              {fotosCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  {fotosCount === 1
                    ? "1 imagem selecionada"
                    : `${fotosCount} imagens selecionadas`}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
        <Button type="submit" name="status" value="agendado" disabled={pending}>
          {pending ? "Finalizando…" : "Finalizar e enviar automaticamente"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        O link será enviado automaticamente de segunda a sexta, entre 8h e
        19h, e aos sábados, entre 8h e 12h. Fora desses períodos, ficará
        programado para a próxima janela disponível.
      </p>
    </form>
  );
}
