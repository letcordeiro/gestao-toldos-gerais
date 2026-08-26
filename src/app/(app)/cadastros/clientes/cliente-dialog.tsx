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
import { InputTelefone } from "@/components/shared/input-telefone";
import { Label } from "@/components/ui/label";
import { CamposEndereco } from "@/components/shared/campos-endereco";
import { salvarCliente, type ClienteFormState } from "./actions";

type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  email: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  cep: string | null;
  documento: string | null;
};

export function ClienteDialog({
  cliente,
  trigger,
}: {
  cliente?: Cliente;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<
    ClienteFormState,
    FormData
  >(salvarCliente, {});

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        {/* Grudados: o formulário com endereço passa da altura da tela. */}
        <DialogHeader className="sticky top-0 z-10 -mx-4 -mt-4 border-b bg-popover px-4 pb-2 pt-4">
          <DialogTitle>
            {cliente ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {cliente && <input type="hidden" name="id" value={cliente.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={cliente?.nome} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone / WhatsApp *</Label>
              <InputTelefone
                id="telefone"
                name="telefone"
                defaultValue={cliente?.telefone}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="documento">CPF / CNPJ</Label>
              <Input
                id="documento"
                name="documento"
                inputMode="numeric"
                placeholder="para gerar contrato"
                defaultValue={cliente?.documento ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" defaultValue={cliente?.email ?? ""} />
          </div>
          <CamposEndereco
            obrigatorio
            inicial={{
              cep: cliente?.cep,
              endereco: cliente?.endereco,
              numero: cliente?.numero,
              complemento: cliente?.complemento,
              bairro: cliente?.bairro,
              cidade: cliente?.cidade,
            }}
          />
          {state.erro && (
            <p className="text-sm text-destructive">{state.erro}</p>
          )}
          <div className="sticky bottom-0 -mx-4 -mb-4 border-t bg-popover px-4 py-3">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
