"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marcarComissaoPaga } from "../../orcamentos/[id]/equipe-actions";

export function PagarComissaoButton({
  linhaId,
  paga,
}: {
  linhaId: number;
  paga: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={paga ? "ghost" : "outline"}
      disabled={ocupado}
      onClick={() => {
        setOcupado(true);
        startTransition(async () => {
          await marcarComissaoPaga(linhaId, !paga);
          router.refresh();
          setOcupado(false);
        });
      }}
    >
      {paga ? (
        <>
          <Undo2 className="size-4" /> Desfazer
        </>
      ) : (
        <>
          <Check className="size-4" /> Pago
        </>
      )}
    </Button>
  );
}
