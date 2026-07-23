"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarInstalacao, type InstalacaoState } from "./instalacao-actions";

export type LinhaInstalacao = {
  qtde: string;
  produto: string;
  estrutura: string;
  revestimento: string;
  rufo: string;
  babado: string;
  vies: string;
};

export type DadosInstalacao = {
  responsavel: string;
  calha: string;
  tipoEscada: string;
  condEstacionamento: string;
  prevEntrega: string; // aaaa-mm-dd
  dataEntrega: string; // aaaa-mm-dd
};

const LINHA_VAZIA: LinhaInstalacao = {
  qtde: "",
  produto: "",
  estrutura: "",
  revestimento: "",
  rufo: "",
  babado: "",
  vies: "",
};

const COLUNAS: { chave: keyof LinhaInstalacao; label: string; ph: string }[] = [
  { chave: "qtde", label: "Qtde", ph: "1" },
  { chave: "produto", label: "Produto", ph: "TOLDO RETO FIXO 2,41X2,35" },
  { chave: "estrutura", label: "Estrut / tipo / cor", ph: "METALICA MARROM" },
  { chave: "revestimento", label: "Revest / tipo / cor", ph: "LONA PVC" },
  { chave: "rufo", label: "Rufo", ph: "-" },
  { chave: "babado", label: "Babado / modelo / cor", ph: "-" },
  { chave: "vies", label: "Viés / modelo / cor", ph: "-" },
];

const CLASSE_SELECT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** Campo de escolha simples — usado onde a resposta é fechada. */
function Escolha({
  id,
  name,
  label,
  valor,
  onChange,
  opcoes,
}: {
  id: string;
  name: string;
  label: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {/* Controlado de propósito: com defaultValue, o campo voltava a "—" na
          tela depois de salvar, dando a impressão de que nada foi gravado. */}
      <select
        id={id}
        name={name}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={CLASSE_SELECT}
      >
        <option value="">—</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function InstalacaoForm({
  orcamentoId,
  dados,
  linhas: linhasIniciais,
}: {
  orcamentoId: number;
  dados: DadosInstalacao;
  linhas: LinhaInstalacao[];
}) {
  const [state, formAction, pending] = useActionState<
    InstalacaoState,
    FormData
  >(salvarInstalacao, {});
  const [linhas, setLinhas] = useState<LinhaInstalacao[]>(
    linhasIniciais.length ? linhasIniciais : [{ ...LINHA_VAZIA }]
  );
  const [calha, setCalha] = useState(dados.calha);
  const [tipoEscada, setTipoEscada] = useState(dados.tipoEscada);
  const [estac, setEstac] = useState(dados.condEstacionamento);

  useEffect(() => {
    if (state.ok) toast.success("Ficha de instalação salva");
  }, [state]);

  function alterar(i: number, chave: keyof LinhaInstalacao, valor: string) {
    setLinhas((atual) =>
      atual.map((l, idx) => (idx === i ? { ...l, [chave]: valor } : l))
    );
  }

  return (
    <form id="form-ficha" action={formAction} className="space-y-4">
      <input type="hidden" name="orcamentoId" value={orcamentoId} />
      <input type="hidden" name="itens" value={JSON.stringify(linhas)} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="responsavel">Responsável no local</Label>
          <Input
            id="responsavel"
            name="responsavel"
            defaultValue={dados.responsavel}
            placeholder="quem recebe a equipe"
          />
        </div>
        <Escolha
          id="calha"
          name="calha"
          label="Calha"
          valor={calha}
          onChange={setCalha}
          opcoes={["Sim", "Não"]}
        />
        <Escolha
          id="tipoEscada"
          name="tipoEscada"
          label="Escada alta"
          valor={tipoEscada}
          onChange={setTipoEscada}
          opcoes={["Sim", "Não"]}
        />
        <Escolha
          id="condEstacionamento"
          name="condEstacionamento"
          label="Estacionamento"
          valor={estac}
          onChange={setEstac}
          opcoes={["Sim", "Não"]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prevEntrega">Previsão de entrega</Label>
          <Input
            id="prevEntrega"
            name="prevEntrega"
            type="date"
            defaultValue={dados.prevEntrega}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dataEntrega">Data de entrega</Label>
          <Input
            id="dataEntrega"
            name="dataEntrega"
            type="date"
            defaultValue={dados.dataEntrega}
          />
        </div>
      </div>

      {/* Linhas de produto */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Produtos</p>
        {linhas.map((linha, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {COLUNAS.map((col) => (
              <div key={col.chave} className="space-y-1">
                <Label
                  htmlFor={`${col.chave}-${i}`}
                  className="text-xs text-muted-foreground"
                >
                  {col.label}
                </Label>
                <Input
                  id={`${col.chave}-${i}`}
                  value={linha[col.chave]}
                  placeholder={col.ph}
                  onChange={(e) => alterar(i, col.chave, e.target.value)}
                />
              </div>
            ))}
            {linhas.length > 1 && (
              <div className="flex items-end lg:col-span-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setLinhas((a) => a.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 className="size-4" /> Remover produto
                </Button>
              </div>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLinhas((a) => [...a, { ...LINHA_VAZIA }])}
        >
          <Plus className="size-4" /> Adicionar produto
        </Button>
      </div>

      {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar ficha"}
        </Button>
      </div>
    </form>
  );
}
