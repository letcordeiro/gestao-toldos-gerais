"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import {
  SITUACAO_VISITA_LABEL,
  type SituacaoVisita,
} from "@/lib/visitas";
import { excluirVisita, mudarSituacaoVisita } from "./actions";

const SITUACOES: SituacaoVisita[] = [
  "agendada",
  "confirmada",
  "realizada",
  "nao_compareceu",
  "cancelada",
];

export function SituacaoVisitaSelect({
  visitaId,
  situacao,
}: {
  visitaId: number;
  situacao: SituacaoVisita;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label="Situação da visita"
      value={situacao}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          const r = await mudarSituacaoVisita(visitaId, e.target.value);
          if (r.erro) toast.error(r.erro);
          else router.refresh();
        })
      }
      className="h-10 rounded-md border border-input bg-transparent px-2 text-sm font-medium sm:h-8 sm:text-xs"
    >
      {SITUACOES.map((s) => (
        <option key={s} value={s}>
          {SITUACAO_VISITA_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

/**
 * Apagar pede confirmação: a lixeira fica colada no seletor de situação e no
 * WhatsApp, e um toque errado no celular sumia com a visita sem aviso. A
 * pergunta lembra do Editar porque quase sempre o cliente só remarcou.
 */
export function ExcluirVisitaButton({
  visitaId,
  clienteNome,
  data,
  hora,
}: {
  visitaId: number;
  clienteNome: string;
  /** Já formatados no servidor, iguais ao que a lista mostra. */
  data: string;
  hora: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const apagar = async () => {
    setOcupado(true);
    try {
      await excluirVisita(visitaId);
      toast.success("Visita apagada");
      setAberto(false);
      router.refresh();
    } catch {
      toast.error("Não foi possível apagar a visita. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Apagar visita"
            className="size-10 text-destructive sm:size-7"
          />
        }
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Apagar a visita de {clienteNome} em {data} às {hora}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se o cliente só remarcou, use Editar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <Button variant="destructive" disabled={ocupado} onClick={apagar}>
            {ocupado ? "Apagando…" : "Apagar visita"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
