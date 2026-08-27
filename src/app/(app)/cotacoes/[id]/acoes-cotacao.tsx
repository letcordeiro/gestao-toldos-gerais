"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITUACAO_COTACAO_LABEL, type SituacaoCotacao } from "@/lib/cotacoes";
import { limparResposta, mudarSituacaoCotacao } from "../actions";

const SITUACOES: SituacaoCotacao[] = ["aberta", "fechada", "cancelada"];

export function SituacaoCotacaoSelect({
  cotacaoId,
  situacao,
}: {
  cotacaoId: number;
  situacao: SituacaoCotacao;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label="Situação da cotação"
      value={situacao}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          const r = await mudarSituacaoCotacao(cotacaoId, e.target.value);
          if (r.erro) toast.error(r.erro);
          else router.refresh();
        })
      }
      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm font-medium shadow-sm"
    >
      {SITUACOES.map((s) => (
        <option key={s} value={s}>
          {SITUACAO_COTACAO_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

export function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          toast.success("Link copiado");
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          toast.error("Não deu para copiar. Copie da barra do navegador.");
        }
      }}
    >
      <Copy className="size-4" />
      {copiado ? "Copiado" : "Copiar link"}
    </Button>
  );
}

export function LimparRespostaButton({ conviteId }: { conviteId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      title="Apaga a resposta para o fornecedor cotar de novo"
      onClick={() =>
        startTransition(async () => {
          await limparResposta(conviteId);
          toast.success("Resposta apagada — o link volta a aceitar cotação");
          router.refresh();
        })
      }
    >
      <RotateCcw className="size-4" /> Refazer
    </Button>
  );
}
