"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InputTelefone } from "@/components/shared/input-telefone";
import { salvarFornecedor, type FornecedorFormState } from "./actions";

export type FornecedorEdicao = {
  id: number;
  nome: string;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  fornece: string | null;
  observacoes: string | null;
};

export function FornecedorDialog({
  fornecedor,
  trigger,
}: {
  fornecedor?: FornecedorEdicao;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<
    FornecedorFormState,
    FormData
  >(salvarFornecedor, {});

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {fornecedor ? "Editar fornecedor" : "Novo fornecedor"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {fornecedor && <input type="hidden" name="id" value={fornecedor.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={fornecedor?.nome}
              placeholder="Ex.: Alumínios BH"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fornece">O que fornece</Label>
            <Input
              id="fornece"
              name="fornece"
              defaultValue={fornecedor?.fornece ?? ""}
              placeholder="Ex.: lona PVC, perfil de alumínio, policarbonato"
            />
            <p className="text-xs text-muted-foreground">
              Aparece na hora de escolher quem vai receber a cotação.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contato">Pessoa de contato</Label>
              <Input
                id="contato"
                name="contato"
                defaultValue={fornecedor?.contato ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">WhatsApp</Label>
              <InputTelefone
                id="telefone"
                name="telefone"
                defaultValue={fornecedor?.telefone ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={fornecedor?.email ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={2}
              defaultValue={fornecedor?.observacoes ?? ""}
            />
          </div>

          {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
