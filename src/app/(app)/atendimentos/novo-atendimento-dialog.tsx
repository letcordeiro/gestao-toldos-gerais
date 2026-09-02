"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { CamposEndereco } from "@/components/shared/campos-endereco";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeletorCliente } from "@/components/shared/seletor-cliente";
import {
  criarAtendimento,
  type NovoAtendimentoState,
} from "./actions";

type ClienteOpcao = { id: number; nome: string; telefone: string };
type VendedorOpcao = { id: number; nome: string };

export function NovoAtendimentoDialog({
  clientes,
  vendedores,
  canais,
  ehGestor,
  paraOrcamento = false,
}: {
  clientes: ClienteOpcao[];
  vendedores: VendedorOpcao[];
  canais: { id: number; nome: string }[];
  ehGestor: boolean;
  /** Quem monta orçamento cai direto no novo orçamento depois de criar. */
  paraOrcamento?: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"novo" | "existente">("novo");
  const [clienteId, setClienteId] = useState<string>("");
  const [state, formAction, pending] = useActionState<
    NovoAtendimentoState,
    FormData
  >(criarAtendimento, {});

  // Para onde ir depois de criar. A navegação NÃO acontece aqui: fica guardada
  // e só dispara quando o diálogo terminou de fechar (onOpenChangeComplete).
  //
  // Navegar junto com setAberto(false) desmontava o diálogo no meio da animação
  // de saída e deixava o FUNDO dele órfão no documento — invisível, mas
  // engolindo todo clique. A página seguinte abria e nada respondia até dar
  // F5. Foi o "site trava ao trocar de página" de 02/09/2026.
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    if (!state.criadoId) return;
    // Quem vende cai direto no orçamento — é o passo seguinte do trabalho.
    // A atendente não monta orçamento, então para ela o destino é a ficha do
    // atendimento, que é o que ela vai usar para encaminhar.
    setDestino(
      paraOrcamento
        ? `/orcamentos/novo?atendimento=${state.criadoId}`
        : `/atendimentos/${state.criadoId}`
    );
    setAberto(false);
  }, [state.criadoId, paraOrcamento]);

  return (
    <Dialog
      open={aberto}
      onOpenChange={setAberto}
      onOpenChangeComplete={(open) => {
        if (open || !destino) return;
        router.push(destino);
        setDestino(null);
      }}
    >
      <DialogTrigger render={<Button>Novo atendimento</Button>} />
      <DialogContent className="sm:max-w-lg">
        {/* Cabeçalho e botão grudados: o formulário é longo e, rolando, dava
            para perder de vista tanto o título quanto o "Criar atendimento". */}
        <DialogHeader className="sticky top-0 z-10 -mx-4 -mt-4 border-b bg-popover px-4 pb-2 pt-4">
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <InputTelefone id="telefone" name="telefone" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" />
                </div>
              </div>
              {/* CEP busca o endereço sozinho (ViaCEP) e preenche rua, bairro
                  e cidade — mesmo componente do cadastro de clientes. */}
              <CamposEndereco />
            </TabsContent>
            <TabsContent value="existente" className="mt-4">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <SeletorCliente
                  opcoes={clientes.map((c) => ({
                    id: c.id,
                    clienteNome: c.nome,
                    clienteTelefone: c.telefone,
                  }))}
                  valor={clienteId}
                  onValorChange={setClienteId}
                />
                {modo === "existente" && clienteId && (
                  <input type="hidden" name="clienteId" value={clienteId} />
                )}
              </div>
            </TabsContent>
          </Tabs>
          {ehGestor && (
            <div className="space-y-1.5">
              <Label htmlFor="vendedorId">Vendedor responsável *</Label>
              <select
                id="vendedorId"
                name="vendedorId"
                defaultValue=""
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Escolha o vendedor
                </option>
                {vendedores.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="canalId">Como chegou até nós</Label>
            <select
              id="canalId"
              name="canalId"
              defaultValue=""
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Não sei / não perguntei</option>
              {canais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" rows={2} />
          </div>
          {state.erro && (
            <p className="text-sm text-destructive">{state.erro}</p>
          )}
          <div className="sticky bottom-0 -mx-4 -mb-4 border-t bg-popover px-4 py-3">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Criando…" : "Criar atendimento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
