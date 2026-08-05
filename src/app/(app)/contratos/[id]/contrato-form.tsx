"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { mascaraMoeda, parseParaCentavos } from "@/lib/format";
import { ESCOPO_LABEL, type EscopoContrato } from "@/lib/contratos";
import { salvarDadosContrato, type ContratoFormState } from "../actions";

const SELECT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export type DadosForm = {
  contratoId: number;
  escopo: EscopoContrato;
  localInstalacao: string;
  observacoesTecnicas: string;
  valorTotal: number;
  prazoDiasUteis: number;
  garantiaMeses: number;
  retencaoPercent: number;
  multaPercent: number;
  jurosMesPercent: number;
  flagMedidas: boolean;
  flagClima: boolean;
  flagEnergia: boolean;
  flagSobMedida: boolean;
  representante: string;
  cidadeEmissao: string;
};

export function ContratoForm({
  inicial,
  editavel,
}: {
  inicial: DadosForm;
  editavel: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    ContratoFormState,
    FormData
  >(salvarDadosContrato, {});

  useEffect(() => {
    if (state.ok) toast.success("Contrato atualizado");
    if (state.erro) toast.error(state.erro);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="contratoId" value={inicial.contratoId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="escopo">Escopo do contrato</Label>
          <select
            id="escopo"
            name="escopo"
            defaultValue={inicial.escopo}
            disabled={!editavel}
            className={SELECT}
          >
            {(Object.keys(ESCOPO_LABEL) as EscopoContrato[]).map((e) => (
              <option key={e} value={e}>
                {ESCOPO_LABEL[e]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="valorTotalVisivel">Valor total do contrato</Label>
          <Input
            id="valorTotalVisivel"
            inputMode="decimal"
            disabled={!editavel}
            defaultValue={(inicial.valorTotal / 100).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            onChange={(e) => {
              const mascarado = mascaraMoeda(e.target.value);
              e.target.value = mascarado;
              const oculto = document.getElementById(
                "valorTotal"
              ) as HTMLInputElement | null;
              if (oculto) {
                oculto.value = String(parseParaCentavos(mascarado) ?? 0);
              }
            }}
          />
          <input
            type="hidden"
            id="valorTotal"
            name="valorTotal"
            defaultValue={inicial.valorTotal}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="localInstalacao">Local da instalação</Label>
        <Input
          id="localInstalacao"
          name="localInstalacao"
          disabled={!editavel}
          defaultValue={inicial.localInstalacao}
          placeholder="Endereço onde o produto será instalado"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacoesTecnicas">Observações técnicas</Label>
        <Textarea
          id="observacoesTecnicas"
          name="observacoesTecnicas"
          rows={3}
          disabled={!editavel}
          defaultValue={inicial.observacoesTecnicas}
          placeholder="Detalhes que devem constar no objeto do contrato"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="prazoDiasUteis">Prazo (dias úteis)</Label>
          <Input
            id="prazoDiasUteis"
            name="prazoDiasUteis"
            type="number"
            min={0}
            max={365}
            inputMode="numeric"
            disabled={!editavel}
            defaultValue={inicial.prazoDiasUteis}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="garantiaMeses">Garantia (meses)</Label>
          <Input
            id="garantiaMeses"
            name="garantiaMeses"
            type="number"
            min={0}
            max={120}
            inputMode="numeric"
            disabled={!editavel}
            defaultValue={inicial.garantiaMeses}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="retencaoPercent">Retenção (%)</Label>
          <Input
            id="retencaoPercent"
            name="retencaoPercent"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            disabled={!editavel}
            defaultValue={inicial.retencaoPercent}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="multaPercent">Multa por atraso (%)</Label>
          <Input
            id="multaPercent"
            name="multaPercent"
            type="number"
            step="0.1"
            min={0}
            max={100}
            inputMode="decimal"
            disabled={!editavel}
            defaultValue={inicial.multaPercent}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jurosMesPercent">Juros ao mês (%)</Label>
          <Input
            id="jurosMesPercent"
            name="jurosMesPercent"
            type="number"
            step="0.1"
            min={0}
            max={100}
            inputMode="decimal"
            disabled={!editavel}
            defaultValue={inicial.jurosMesPercent}
          />
        </div>
      </div>

      <fieldset className="space-y-2 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Cláusulas opcionais</legend>
        {[
          {
            nome: "flagSobMedida",
            rotulo: "Produto sob medida (sem direito de arrependimento)",
            valor: inicial.flagSobMedida,
          },
          {
            nome: "flagMedidas",
            rotulo: "Prazo condicionado à conferência de medidas",
            valor: inicial.flagMedidas,
          },
          {
            nome: "flagClima",
            rotulo: "Prazo suspenso por condições climáticas",
            valor: inicial.flagClima,
          },
          {
            nome: "flagEnergia",
            rotulo: "Contratante fornece ponto de energia",
            valor: inicial.flagEnergia,
          },
        ].map((flag) => (
          <div key={flag.nome} className="flex items-center justify-between gap-3">
            <Label htmlFor={flag.nome} className="font-normal">
              {flag.rotulo}
            </Label>
            <Switch
              id={flag.nome}
              name={flag.nome}
              defaultChecked={flag.valor}
              disabled={!editavel}
            />
          </div>
        ))}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="representante">Representante da contratada</Label>
          <Input
            id="representante"
            name="representante"
            disabled={!editavel}
            defaultValue={inicial.representante}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cidadeEmissao">Cidade de emissão</Label>
          <Input
            id="cidadeEmissao"
            name="cidadeEmissao"
            disabled={!editavel}
            defaultValue={inicial.cidadeEmissao}
          />
        </div>
      </div>

      {editavel && (
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar dados do contrato"}
        </Button>
      )}
    </form>
  );
}
