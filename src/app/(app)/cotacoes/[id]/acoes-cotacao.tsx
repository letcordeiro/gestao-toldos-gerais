"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

/**
 * Apaga a resposta do fornecedor para ele cotar de novo. Pergunta antes: os
 * preços somem de vez, e a explicação morava num `title` que no celular
 * ninguém vê.
 */
export function LimparRespostaButton({
  conviteId,
  fornecedorNome,
}: {
  conviteId: number;
  fornecedorNome: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const apagar = async () => {
    setOcupado(true);
    try {
      await limparResposta(conviteId);
      toast.success("Resposta apagada — o link volta a aceitar cotação");
      setAberto(false);
      router.refresh();
    } catch {
      toast.error("Não foi possível apagar a cotação. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
        <RotateCcw className="size-4" /> Pedir de novo
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar a cotação de {fornecedorNome}?</AlertDialogTitle>
          <AlertDialogDescription>
            Os preços que ele enviou somem e o link dele volta a aceitar
            resposta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <Button variant="destructive" disabled={ocupado} onClick={apagar}>
            {ocupado ? "Apagando…" : "Apagar e pedir de novo"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
