"use client";

import { useActionState, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  criarAtendimento,
  type NovoAtendimentoState,
} from "./actions";

type ClienteOpcao = { id: number; nome: string; telefone: string };

export function NovoAtendimentoDialog({
  clientes,
}: {
  clientes: ClienteOpcao[];
}) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"novo" | "existente">("novo");
  const [clienteId, setClienteId] = useState<string>("");
  const [state, formAction, pending] = useActionState<
    NovoAtendimentoState,
    FormData
  >(criarAtendimento, {});

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button>Novo atendimento</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo atendimento</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <Tabs value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
            <TabsList className="w-full">
              <TabsTrigger value="novo" className="flex-1">
                Novo cliente
              </TabsTrigger>
              <TabsTrigger value="existente" className="flex-1">
                Cliente existente
              </TabsTrigger>
            </TabsList>
            <TabsContent value="novo" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" name="nome" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  name="telefone"
                  placeholder="(31) 9…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" name="cidade" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" name="endereco" />
              </div>
            </TabsContent>
            <TabsContent value="existente" className="mt-4">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select
                  value={clienteId || null}
                  items={clientes.map((c) => ({
                    value: String(c.id),
                    label: `${c.nome} — ${c.telefone}`,
                  }))}
                  onValueChange={(v) => setClienteId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome} — {c.telefone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {modo === "existente" && clienteId && (
                  <input type="hidden" name="clienteId" value={clienteId} />
                )}
              </div>
            </TabsContent>
          </Tabs>
          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" rows={3} />
          </div>
          {state.erro && (
            <p className="text-sm text-destructive">{state.erro}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Criando…" : "Criar atendimento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
