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
import { salvarVendedor, type VendedorFormState } from "./actions";

type Vendedor = {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
};

export function VendedorDialog({
  vendedor,
  trigger,
}: {
  vendedor?: Vendedor;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<
    VendedorFormState,
    FormData
  >(salvarVendedor, {});

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {vendedor ? "Editar vendedor" : "Novo vendedor"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {vendedor && <input type="hidden" name="id" value={vendedor.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={vendedor?.nome} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefone">Telefone / WhatsApp</Label>
            <Input
              id="telefone"
              name="telefone"
              defaultValue={vendedor?.telefone ?? ""}
              placeholder="(31) 9…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              defaultValue={vendedor?.email ?? ""}
            />
          </div>
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
