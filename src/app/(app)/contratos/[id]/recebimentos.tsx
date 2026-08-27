"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarCentavos } from "@/lib/format";
import { MEIO_LABEL, type MeioPagamento } from "@/lib/contratos";
import {
  SITUACAO_LABEL,
  diasDeAtraso,
  situacaoParcela,
  vencimentoEfetivo,
  type GatilhoVencimento,
} from "@/lib/cobranca";
import { marcarParcelaRecebida } from "../actions";

export type ParcelaRecebimento = {
  id: number;
  rotulo: string;
  valor: number;
  meio: MeioPagamento;
  gatilho: GatilhoVencimento;
  diasApos: number | null;
  dataVencimento: Date | null;
  pagoEm: Date | null;
};

const COR: Record<string, string> = {
  paga: "text-primary",
  vencida: "text-destructive",
  a_vencer: "text-muted-foreground",
  sem_data: "text-muted-foreground",
};

/**
 * O que ainda falta receber deste contrato. Separado do plano de pagamento de
 * propósito: o plano é o que foi combinado (e trava depois de emitir); isto
 * aqui é a operação do dia — entrou ou não entrou.
 */
export function Recebimentos({
  parcelas,
  dataAssinatura,
  dataEntrega,
}: {
  parcelas: ParcelaRecebimento[];
  dataAssinatura: Date | null;
  dataEntrega: Date | null;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const marcos = { dataAssinatura, dataEntrega };

  const aReceber = parcelas
    .filter((p) => !p.pagoEm)
    .reduce((s, p) => s + p.valor, 0);
  const recebido = parcelas
    .filter((p) => p.pagoEm)
    .reduce((s, p) => s + p.valor, 0);

  function alternar(p: ParcelaRecebimento) {
    setOcupado(p.id);
    startTransition(async () => {
      const r = await marcarParcelaRecebida(p.id, !p.pagoEm);
      if (r?.erro) toast.error(r.erro);
      else {
        toast.success(!p.pagoEm ? "Parcela marcada como recebida" : "Recebimento desfeito");
        router.refresh();
      }
      setOcupado(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="text-muted-foreground">Recebido: </span>
          <strong className="tabular-nums text-primary">
            {formatarCentavos(recebido)}
          </strong>
        </span>
        <span>
          <span className="text-muted-foreground">A receber: </span>
          <strong className="tabular-nums">{formatarCentavos(aReceber)}</strong>
        </span>
      </div>

      <ul className="divide-y rounded-lg border">
        {parcelas.map((p) => {
          const situacao = situacaoParcela(p, marcos);
          const venc = vencimentoEfetivo(p, marcos);
          const atraso = diasDeAtraso(p, marcos);
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {p.rotulo}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {MEIO_LABEL[p.meio]}
                  </span>
                </p>
                <p className={"text-xs " + COR[situacao]}>
                  {SITUACAO_LABEL[situacao]}
                  {venc && situacao !== "paga"
                    ? ` · vence ${venc.toLocaleDateString("pt-BR")}`
                    : ""}
                  {atraso > 0 ? ` · ${atraso} dia(s) de atraso` : ""}
                  {p.pagoEm
                    ? ` em ${p.pagoEm.toLocaleDateString("pt-BR")}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{formatarCentavos(p.valor)}</span>
                <Button
                  size="sm"
                  variant={p.pagoEm ? "ghost" : "outline"}
                  disabled={ocupado === p.id}
                  onClick={() => alternar(p)}
                >
                  {p.pagoEm ? (
                    <>
                      <Undo2 className="size-4" /> Desfazer
                    </>
                  ) : (
                    <>
                      <Check className="size-4" /> Recebida
                    </>
                  )}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Parcela presa a um evento (“na assinatura”, “30 dias após a instalação”)
        só ganha data quando o evento acontece — até lá ela não entra na
        cobrança.
      </p>
    </div>
  );
}
