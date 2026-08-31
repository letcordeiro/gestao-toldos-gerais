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
import { TIPO_CHAMADO_LABEL, type TipoServico } from "@/lib/chamados";
import { centavosParaInput, mascaraMoeda } from "@/lib/format";
import {
  orcamentosDoAtendimento,
  salvarChamado,
  type ChamadoFormState,
} from "./actions";

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
  instalador: string | null;
  valor: number | null;
  tipoServico: TipoServico | null;
  servicoOutros: string | null;
  visitaEm: Date | null;
};

export type AtendimentoOpcao = {
  id: number;
  clienteNome: string;
  clienteTelefone: string;
};

/** Date → "2026-09-03", que é o formato do <input type="date">. */
function paraInputData(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ChamadoDialog({
  chamado,
  atendimentoId,
  atendimentos = [],
  orcamentos = [],
  responsaveis = [],
  irParaChamado = false,
  trigger,
}: {
  chamado?: ChamadoEdicao;
  /** Fixo quando o diálogo abre de dentro de um atendimento. */
  atendimentoId?: number;
  /** Para escolher o cliente aqui dentro, quando não há atendimento fixo. */
  atendimentos?: AtendimentoOpcao[];
  orcamentos?: { id: number; numero: string }[];
  responsaveis?: { id: number; nome: string }[];
  /** Depois de criar, abre o chamado — usado quando vem do atendimento. */
  irParaChamado?: boolean;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  // Sem atendimento fixo, o cliente é escolhido aqui dentro.
  const [escolhido, setEscolhido] = useState<string>(
    atendimentoId ? String(atendimentoId) : ""
  );
  const alvo = atendimentoId ?? (escolhido ? Number(escolhido) : null);

  // O campo de descrição só faz sentido quando o serviço é "Outros" — deixá-lo
  // sempre visível faria a ficha ser preenchida com texto que não é impresso.
  const [tipoServico, setTipoServico] = useState<string>(
    chamado?.tipoServico ?? ""
  );
  const [valor, setValor] = useState<string>(
    centavosParaInput(chamado?.valor ?? null)
  );

  // Aberto pela lista, o cliente só é conhecido depois da escolha — então os
  // orçamentos dele vêm aqui. Sem essa ligação o chamado nasce sem data de
  // instalação, e a garantia fica "indefinida" para sempre.
  const [orcamentosDoCliente, setOrcamentosDoCliente] = useState(orcamentos);
  useEffect(() => {
    if (atendimentoId || alvo == null) {
      setOrcamentosDoCliente(orcamentos);
      return;
    }
    let atual = true;
    orcamentosDoAtendimento(alvo)
      .then((lista) => {
        if (atual) setOrcamentosDoCliente(lista);
      })
      .catch(() => {});
    // Troca de cliente descarta a lista anterior: oferecer o orçamento de outro
    // cliente ligaria o chamado ao serviço errado.
    return () => {
      atual = false;
    };
  }, [atendimentoId, alvo, orcamentos]);

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
            {chamado ? "Editar chamado" : "Nova ordem de manutenção"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {chamado && <input type="hidden" name="id" value={chamado.id} />}
          <input type="hidden" name="atendimentoId" value={alvo ?? ""} />

          {!atendimentoId && (
            <div className="space-y-1.5">
              <Label htmlFor="escolhaAtendimento">Cliente *</Label>
              <select
                id="escolhaAtendimento"
                value={escolhido}
                onChange={(e) => setEscolhido(e.target.value)}
                className={SELECT_CLASSES}
              >
                <option value="">Escolha o cliente</option>
                {atendimentos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.clienteNome} — {a.clienteTelefone}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {orcamentosDoCliente.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="orcamentoId">Serviço relacionado</Label>
              <select
                id="orcamentoId"
                name="orcamentoId"
                defaultValue={chamado?.orcamentoId ?? ""}
                className={SELECT_CLASSES}
              >
                <option value="">Nenhum</option>
                {orcamentosDoCliente.map((o) => (
                  <option key={o.id} value={o.id}>
                    Orçamento {o.numero}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                É o que permite conferir se ainda está no prazo de garantia — e
                traz a data da instalação para a ficha impressa.
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

          {/* Campos da ficha impressa que a equipe leva ao cliente. */}
          <fieldset className="space-y-3 rounded-md border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              Ordem de manutenção
            </legend>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tipoServico">Serviço</Label>
                <select
                  id="tipoServico"
                  name="tipoServico"
                  value={tipoServico}
                  onChange={(e) => setTipoServico(e.target.value)}
                  className={SELECT_CLASSES}
                >
                  <option value="">A definir</option>
                  <option value="vedacao">Vedação</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visitaEm">Data da ida ao local</Label>
                <Input
                  id="visitaEm"
                  name="visitaEm"
                  type="date"
                  defaultValue={
                    chamado?.visitaEm ? paraInputData(chamado.visitaEm) : ""
                  }
                />
              </div>
            </div>

            {tipoServico === "outros" && (
              <div className="space-y-1.5">
                <Label htmlFor="servicoOutros">Qual serviço</Label>
                <Input
                  id="servicoOutros"
                  name="servicoOutros"
                  defaultValue={chamado?.servicoOutros ?? ""}
                  placeholder="Ex.: troca do motor"
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="instalador">Instalador</Label>
                <Input
                  id="instalador"
                  name="instalador"
                  defaultValue={chamado?.instalador ?? ""}
                  placeholder="Quem vai ao local"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valor">Valor</Label>
                <Input
                  id="valor"
                  name="valor"
                  inputMode="numeric"
                  value={valor}
                  onChange={(e) => setValor(mascaraMoeda(e.target.value))}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground">
                  O que se cobra quando a visita não entra na garantia.
                </p>
              </div>
            </div>
          </fieldset>

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
