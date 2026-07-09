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
import { excluirModelo } from "./actions";

export function ExcluirModeloButton({
  modeloId,
  nome,
}: {
  modeloId: number;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" className="text-destructive" />}
      >
        Excluir
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{nome}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja realmente excluir este modelo? Essa ação não pode ser
            desfeita. (Se ele já estiver em algum orçamento, prefira desativá-lo.)
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const resultado = await excluirModelo(modeloId);
                if (resultado.erro) toast.error(resultado.erro);
                else {
                  toast.success("Modelo excluído");
                  setAberto(false);
                }
              })
            }
          >
            {pending ? "Excluindo…" : "Excluir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
