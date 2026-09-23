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

/**
 * "Excluir" com confirmação, no padrão de avisos/excluir-aviso-button.tsx.
 * Os cadastros excluíam no primeiro clique: um toque errado na linha de baixo
 * apagava o registro sem volta. Um componente só para os seis cadastros, para
 * a pergunta e o tratamento de erro não saírem diferentes em cada tela.
 */
export function ExcluirConfirmado({
  titulo,
  descricao,
  excluir,
  sucesso,
}: {
  titulo: string;
  descricao: string;
  excluir: () => Promise<{ erro?: string }>;
  sucesso: string;
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
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                // Sucesso só com o retorno em mãos: antes, alguns cadastros
                // mostravam "excluído" sem olhar o que a action devolveu.
                try {
                  const resultado = await excluir();
                  if (resultado.erro) toast.error(resultado.erro);
                  else toast.success(sucesso);
                } catch {
                  toast.error("Não deu para excluir. Tente de novo.");
                } finally {
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
