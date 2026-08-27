"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { alternarResumo, enviarResumoAgora, excluirResumo } from "./actions";

export function AtivoResumoSwitch({ id, ativo }: { id: number; ativo: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={ativo}
      disabled={pending}
      aria-label={ativo ? "Desativar resumo" : "Ativar resumo"}
      onCheckedChange={(valor) =>
        startTransition(async () => {
          await alternarResumo(id, valor);
          toast.success(valor ? "Resumo ativado" : "Resumo pausado");
        })
      }
    />
  );
}

export function EnviarAgoraButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await enviarResumoAgora(id);
          if (r.erro) toast.error(`Não enviou: ${r.erro}`);
          else toast.success("Resumo enviado");
        })
      }
    >
      <Send className="size-4" />
      {pending ? "Enviando…" : "Enviar agora"}
    </Button>
  );
}

export function ExcluirResumoButton({ id, nome }: { id: number; nome: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await excluirResumo(id);
          toast.success(`“${nome}” excluído`);
        })
      }
    >
      Excluir
    </Button>
  );
}
