"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { excluirFase } from "./actions";

export function ExcluirFaseButton({
  faseId,
  nome,
}: {
  faseId: number;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-destructive" />
        }
      >
        Excluir
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir fase “{nome}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Só é possível excluir fases sem atendimentos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const resultado = await excluirFase(faseId);
                if (resultado.erro) toast.error(resultado.erro);
                else toast.success("Fase excluída");
                setAberto(false);
              })
            }
          >
            Excluir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
