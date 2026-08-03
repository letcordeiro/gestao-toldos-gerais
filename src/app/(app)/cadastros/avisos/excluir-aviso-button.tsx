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
import { excluirAviso } from "./actions";

export function ExcluirAvisoButton({
  avisoId,
  nome,
}: {
  avisoId: number;
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
          <AlertDialogTitle>Excluir o aviso “{nome}”?</AlertDialogTitle>
          <AlertDialogDescription>
            O aviso some da tela de Atendimentos e o histórico de “já contatei”
            dele é apagado. Essa ação não pode ser desfeita. Se quiser só
            pausar, use o botão de ativo/inativo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const resultado = await excluirAviso(avisoId);
                if (resultado.erro) toast.error(resultado.erro);
                else toast.success("Aviso excluído");
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
