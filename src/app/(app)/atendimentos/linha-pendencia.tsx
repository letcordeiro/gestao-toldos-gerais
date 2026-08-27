"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { marcarContatoAviso } from "./actions";

/**
 * Uma linha de pendência do aviso, com os botões de dispensa.
 *
 * A dispensa é OTIMISTA: o item sai da lista no clique e só volta se o
 * servidor recusar. Antes dependia de a tela inteira se redesenhar depois da
 * gravação — quando isso não acontecia, o item continuava lá e dava a
 * impressão de que o clique não tinha feito nada.
 */
export function LinhaPendencia({
  avisoId,
  alvoId,
  temRearme,
  children,
}: {
  avisoId: number;
  alvoId: number;
  /** Aviso que re-arma também oferece "não avisar mais". */
  temRearme: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [dispensado, setDispensado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  if (dispensado) return null;

  async function dispensar(definitivo: boolean) {
    setDispensado(true);
    setSalvando(true);
    try {
      await marcarContatoAviso(avisoId, alvoId, definitivo);
      toast.success(
        definitivo ? "Não avisaremos mais sobre este" : "Marcado como contatado"
      );
      // Reconta o cabeçalho do aviso e some com o bloco se esvaziou.
      router.refresh();
    } catch {
      // Não gravou: devolve o item para a lista em vez de sumir calado.
      setDispensado(false);
      toast.error("Não deu para salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const estilo =
    "text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50";

  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {children}
      <button type="button" disabled={salvando} className={estilo}
        onClick={() => dispensar(false)}>
        já contatei
      </button>
      {temRearme && (
        <button type="button" disabled={salvando} className={estilo}
          onClick={() => dispensar(true)}>
          não avisar mais
        </button>
      )}
    </li>
  );
}
