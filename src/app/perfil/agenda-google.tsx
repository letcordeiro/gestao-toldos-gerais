"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { desconectarAgenda } from "./actions";

/**
 * Conectar / desconectar a agenda do Google, na tela do próprio vendedor.
 *
 * Só o dono da agenda conecta a dele: não existe um gestor conectando a agenda
 * de outra pessoa, porque quem autoriza o acesso é a conta Google dela.
 */
export function AgendaGoogle({
  conexao,
  disponivel,
}: {
  conexao: { googleEmail: string; conectadoEm: string; ultimoErro: string | null } | null;
  /** Falso quando o sistema ainda não tem as chaves do Google configuradas. */
  disponivel: boolean;
}) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  if (!disponivel) {
    return (
      <p className="text-sm text-muted-foreground">
        A conexão com o Google Agenda ainda não está configurada neste sistema.
      </p>
    );
  }

  async function desconectar() {
    setSaindo(true);
    try {
      await desconectarAgenda();
      toast.success("Agenda desconectada");
      router.refresh();
    } catch {
      toast.error("Não deu para desconectar. Tente de novo.");
    } finally {
      setSaindo(false);
    }
  }

  if (!conexao) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Conectando sua agenda, quem for marcar uma visita para você enxerga
          os seus horários livres. O sistema lê <strong>só os horários
          ocupados</strong> — nunca o título nem os convidados dos seus
          compromissos — e não escreve nada na sua agenda.
        </p>
        <Button
          nativeButton={false}
          render={<a href="/api/google/conectar" />}
        >
          Conectar Google Agenda
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">
        Conectada a <strong>{conexao.googleEmail}</strong>
        <span className="text-muted-foreground"> · desde {conexao.conectadoEm}</span>
      </p>
      {conexao.ultimoErro && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
          {conexao.ultimoErro} Conecte de novo para voltar a mostrar seus
          horários.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href="/api/google/conectar" />}
        >
          Reconectar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={saindo}
          onClick={desconectar}
        >
          {saindo ? "Desconectando…" : "Desconectar"}
        </Button>
      </div>
    </div>
  );
}
