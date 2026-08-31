"use client";

import { useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { combinaBusca, compararNomes } from "@/lib/busca-cliente";

/**
 * Escolher cliente digitando.
 *
 * Com a base passando de algumas dezenas de clientes, um <select> comum vira
 * uma rolagem longa: quem procura "Carlos" tem que caçar a letra C na lista.
 * Aqui a lista chega em ordem alfabética e digitar filtra — por qualquer parte
 * do nome, não só pelo começo, porque "carlos" também tem que achar
 * "João Carlos". O telefone entra na busca junto, que é como se distingue
 * dois homônimos.
 *
 * O valor vai para o formulário num <input type="hidden">: as Server Actions
 * continuam recebendo o mesmo id que sempre receberam.
 */

export type OpcaoCliente = {
  /**
   * Id que vai para o formulário. Depende da tela: nos diálogos de chamado e
   * visita é o id do ATENDIMENTO; no "cliente existente" do novo atendimento é
   * o id do CLIENTE. Quem chama decide — aqui é só o valor escolhido.
   */
  id: number;
  clienteNome: string;
  clienteTelefone: string;
  /** Texto extra no fim da linha, ex.: a fase do funil. */
  detalhe?: string;
};

type Item = { value: string; label: string };

export function SeletorCliente({
  id,
  name,
  opcoes,
  valor,
  onValorChange,
  placeholder = "Digite o nome do cliente",
  className,
}: {
  id?: string;
  /** Quando informado, o id escolhido vai no formulário com este nome. */
  name?: string;
  opcoes: OpcaoCliente[];
  /** Id escolhido, como string ("" = nenhum). */
  valor: string;
  onValorChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const itens: Item[] = useMemo(
    () =>
      [...opcoes]
        // Ordem alfabética aqui também, e não só na consulta: a tela pode
        // receber a lista de qualquer lugar, e a ordem é parte do combinado.
        .sort((a, b) => compararNomes(a.clienteNome, b.clienteNome))
        .map((o) => ({
          value: String(o.id),
          label: [o.clienteNome, o.clienteTelefone, o.detalhe]
            .filter(Boolean)
            .join(" — "),
        })),
    [opcoes]
  );

  const selecionado = itens.find((i) => i.value === valor) ?? null;
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(
    () => itens.filter((i) => combinaBusca(i.label, busca)),
    [itens, busca]
  );

  return (
    <Combobox.Root
      items={filtrados}
      value={selecionado}
      onValueChange={(item: Item | null) => onValorChange(item?.value ?? "")}
      inputValue={busca}
      onInputValueChange={setBusca}
    >
      {name && <input type="hidden" name={name} value={valor} />}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-8 pr-8 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring",
            className
          )}
        />
        <Combobox.Trigger
          aria-label="Ver todos os clientes"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronDownIcon className="size-4" />
        </Combobox.Trigger>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50">
          <Combobox.Popup className="max-h-64 w-[var(--anchor-width)] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum cliente com esse nome.
            </Combobox.Empty>
            <Combobox.List>
              {(item: Item) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="cursor-default select-none rounded-sm px-2 py-1.5 text-sm data-[highlighted]:bg-secondary data-[selected]:font-medium"
                >
                  {item.label}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

