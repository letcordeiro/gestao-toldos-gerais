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
  whatsapp: string | null;
  telefoneFixo: string | null;
  email: string | null;
  temAcesso: boolean;
  papel: "gestor" | "vendedor";
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                defaultValue={vendedor?.whatsapp ?? ""}
                placeholder="(31) 9…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefoneFixo">Telefone fixo</Label>
              <Input
                id="telefoneFixo"
                name="telefoneFixo"
                defaultValue={vendedor?.telefoneFixo ?? ""}
                placeholder="(31) 3…"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O próprio vendedor confirma/completa esses dados no primeiro acesso.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail (login)</Label>
            <Input
              id="email"
              name="email"
              defaultValue={vendedor?.email ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="papel">Papel de acesso</Label>
            <select
              id="papel"
              name="papel"
              defaultValue={vendedor?.papel ?? "vendedor"}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="vendedor">Vendedor (vê só o que é dele)</option>
              <option value="gestor">Gestor (vê tudo e gerencia)</option>
            </select>
          </div>
          <div className="space-y-1.5 rounded-lg border p-3">
            <Label htmlFor="senha">Senha de acesso</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              placeholder={
                vendedor?.temAcesso
                  ? "•••••••• (deixe em branco pra manter)"
                  : "defina uma senha pra este vendedor entrar"
              }
            />
            <p className="text-xs text-muted-foreground">
              {vendedor?.temAcesso
                ? "Este vendedor já tem acesso. Preencha só se quiser trocar a senha."
                : "Com e-mail + senha, o vendedor entra no sistema e vira o responsável automático dos orçamentos dele."}
            </p>
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
