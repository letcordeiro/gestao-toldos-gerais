"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { marcarContatoAviso } from "./actions";

/**
 * "já contatei" / "não avisar mais" de um item do aviso.
 *
 * Era um <form action={...}> nativo: a dispensa gravava no banco, mas a lista
 * nem sempre atualizava — dava a impressão de que o clique não funcionou e
 * só saía recarregando a página. Aqui a transição termina com router.refresh(),
 * que refaz a lista, e o item some na hora.
 */
export function BotaoContatoAviso({
  avisoId,
  alvoId,
  definitivo,
  children,
}: {
  avisoId: number;
  alvoId: number;
  definitivo: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  return (
    <button
      type="button"
      disabled={salvando}
      className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
      onClick={async () => {
        setSalvando(true);
        try {
          await marcarContatoAviso(avisoId, alvoId, definitivo);
          router.refresh();
          toast.success(
            definitivo ? "Não avisaremos mais sobre este" : "Marcado como contatado"
          );
        } catch {
          toast.error("Não deu para salvar. Tente de novo.");
        } finally {
          setSalvando(false);
        }
      }}
    >
      {salvando ? "salvando…" : children}
    </button>
  );
}
