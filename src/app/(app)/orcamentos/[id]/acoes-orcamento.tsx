"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { duplicarOrcamento, excluirOrcamento } from "../actions";

/**
 * Tudo que não é o próximo passo mora aqui. Antes eram nove botões lado a lado
 * no topo — dava para ler a tela inteira sem descobrir o que fazer agora.
 */
export function AcoesOrcamento({
  orcamentoId,
  numero,
  status,
  podeEditar,
  linkProposta,
}: {
  orcamentoId: number;
  numero: string;
  status: string;
  podeEditar: boolean;
  linkProposta: string | null;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" aria-label="Mais ações">
              <MoreHorizontal className="size-4" />
              <span className="hidden sm:inline">Mais ações</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          {podeEditar && (
            <DropdownMenuItem
              render={<Link href={`/orcamentos/${orcamentoId}/editar`} />}
            >
              <Pencil className="size-4" /> Editar orçamento
            </DropdownMenuItem>
          )}
          {podeEditar && (
            <DropdownMenuItem
              onClick={() =>
                startTransition(async () => {
                  // A action redireciona para a edição da cópia.
                  await duplicarOrcamento(orcamentoId);
                })
              }
            >
              <Copy className="size-4" /> Duplicar
            </DropdownMenuItem>
          )}
          {linkProposta && (
            <DropdownMenuItem
              render={
                <a href={linkProposta} target="_blank" rel="noopener" />
              }
            >
              <ExternalLink className="size-4" /> Abrir link do cliente
            </DropdownMenuItem>
          )}
          {status === "rascunho" && podeEditar && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setConfirmando(true)}
              >
                <Trash2 className="size-4" /> Excluir orçamento
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o orçamento {numero}?</AlertDialogTitle>
            <AlertDialogDescription>
              Só dá para excluir rascunho — o que já foi ao cliente fica no
              histórico. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await excluirOrcamento(orcamentoId);
                  if (r?.erro) toast.error(r.erro);
                  else router.push("/orcamentos");
                })
              }
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
