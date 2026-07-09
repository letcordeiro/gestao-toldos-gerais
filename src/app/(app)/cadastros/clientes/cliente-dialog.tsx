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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
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
          <div className="space-y-1.5">
            <Label htmlFor="telefone">Telefone *</Label>
            <Input
              id="telefone"
              name="telefone"
              defaultValue={cliente?.telefone}
              placeholder="(31) 9…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" defaultValue={cliente?.email ?? ""} />
          </div>
          <CamposEndereco
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
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
