"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, MessageCircle, Pencil, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GAVETA_LABEL,
  ORDEM_GAVETAS,
  PRIORIDADE_COR,
  TIPO_TAREFA_LABEL,
  gavetaDaTarefa,
  textoPrazo,
  type Gaveta,
} from "@/lib/tarefas";
import { linkWhatsApp } from "@/lib/whatsapp";
import { adiarTarefa, alternarTarefa, excluirTarefa } from "./actions";
import { TarefaDialog, type TarefaEdicao } from "./tarefa-dialog";

export type TarefaLinha = TarefaEdicao & {
  status: "pendente" | "concluida" | "cancelada";
  mensagem: string | null;
  automatica: boolean;
  atendimentoId: number | null;
  clienteNome: string | null;
  clienteTelefone: string | null;
  responsavelNome: string | null;
};

export function ListaTarefas({
  tarefas,
  responsaveis = [],
  // Na tela do atendimento o nome do cliente é redundante.
  mostrarCliente = true,
  vazio = "Nenhuma tarefa por aqui.",
}: {
  tarefas: TarefaLinha[];
  responsaveis?: { id: number; nome: string }[];
  mostrarCliente?: boolean;
  vazio?: string;
}) {
  if (tarefas.length === 0) {
    return <p className="text-sm text-muted-foreground">{vazio}</p>;
  }

  // Concluídas ficam sempre por último, fora das gavetas de prazo.
  const pendentes = tarefas.filter((t) => t.status === "pendente");
  const feitas = tarefas.filter((t) => t.status !== "pendente");

  const grupos = new Map<Gaveta, TarefaLinha[]>();
  for (const t of pendentes) {
    const g = gavetaDaTarefa(t.previstaEm);
    grupos.set(g, [...(grupos.get(g) ?? []), t]);
  }

  return (
    <div className="space-y-5">
      {ORDEM_GAVETAS.map((gaveta) => {
        const itens = grupos.get(gaveta);
        if (!itens?.length) return null;
        return (
          <section key={gaveta} className="space-y-1.5">
            <h3
              className={
                "text-xs font-semibold uppercase tracking-wide " +
                (gaveta === "atrasada"
                  ? "text-destructive"
                  : "text-muted-foreground")
              }
            >
              {GAVETA_LABEL[gaveta]}{" "}
              <span className="font-normal">({itens.length})</span>
            </h3>
            <ul className="divide-y rounded-lg border bg-card">
              {itens.map((t) => (
                <Item
                  key={t.id}
                  tarefa={t}
                  responsaveis={responsaveis}
                  mostrarCliente={mostrarCliente}
                  atrasada={gaveta === "atrasada"}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {feitas.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Concluídas <span className="font-normal">({feitas.length})</span>
          </h3>
          <ul className="divide-y rounded-lg border bg-card">
            {feitas.map((t) => (
              <Item
                key={t.id}
                tarefa={t}
                responsaveis={responsaveis}
                mostrarCliente={mostrarCliente}
                atrasada={false}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Item({
  tarefa,
  responsaveis,
  mostrarCliente,
  atrasada,
}: {
  tarefa: TarefaLinha;
  responsaveis: { id: number; nome: string }[];
  mostrarCliente: boolean;
  atrasada: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const feita = tarefa.status !== "pendente";

  async function rodar(fn: () => Promise<void>, erro: string) {
    setOcupado(true);
    try {
      await fn();
      router.refresh();
    } catch {
      toast.error(erro);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <li className="flex items-start gap-3 p-3">
      <button
        type="button"
        aria-label={feita ? "Reabrir tarefa" : "Concluir tarefa"}
        disabled={ocupado}
        onClick={() =>
          rodar(
            () => alternarTarefa(tarefa.id, !feita),
            "Não deu para atualizar a tarefa."
          )
        }
        className={
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors " +
          (feita
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10")
        }
      >
        {feita && <Check className="size-3" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={
            "text-sm font-medium " + (feita ? "text-muted-foreground line-through" : "")
          }
        >
          {tarefa.titulo}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span
            className="inline-flex items-center gap-1"
            title={`Prioridade ${tarefa.prioridade}`}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: PRIORIDADE_COR[tarefa.prioridade] }}
            />
            {TIPO_TAREFA_LABEL[tarefa.tipo]}
          </span>
          {!feita && (
            <span className={atrasada ? "font-medium text-destructive" : ""}>
              · {textoPrazo(tarefa.previstaEm)}
            </span>
          )}
          {mostrarCliente && tarefa.clienteNome && (
            <>
              <span>·</span>
              {tarefa.atendimentoId ? (
                <Link
                  href={`/atendimentos/${tarefa.atendimentoId}`}
                  className="hover:underline"
                >
                  {tarefa.clienteNome}
                </Link>
              ) : (
                <span>{tarefa.clienteNome}</span>
              )}
            </>
          )}
          {tarefa.responsavelNome && <span>· {tarefa.responsavelNome}</span>}
          {tarefa.automatica && <span>· automática</span>}
        </p>
        {tarefa.descricao && !feita && (
          <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
            {tarefa.descricao}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <TarefaDialog
          tarefa={tarefa}
          responsaveis={responsaveis}
          trigger={
            <Button variant="ghost" size="sm" aria-label="Editar tarefa">
              <Pencil className="size-4" />
            </Button>
          }
        />
        {!feita && tarefa.mensagem && tarefa.clienteTelefone && (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={linkWhatsApp(tarefa.clienteTelefone, tarefa.mensagem)}
                target="_blank"
                rel="noopener"
              />
            }
          >
            <MessageCircle className="size-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                aria-label="Ações da tarefa"
                disabled={ocupado}
              >
                ⋯
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {!feita && (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    rodar(
                      () => adiarTarefa(tarefa.id, 1),
                      "Não deu para adiar."
                    )
                  }
                >
                  <Clock className="size-4" /> Adiar para amanhã
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    rodar(
                      () => adiarTarefa(tarefa.id, 7),
                      "Não deu para adiar."
                    )
                  }
                >
                  <Clock className="size-4" /> Adiar 1 semana
                </DropdownMenuItem>
              </>
            )}
            {feita && (
              <DropdownMenuItem
                onClick={() =>
                  rodar(
                    () => alternarTarefa(tarefa.id, false),
                    "Não deu para reabrir."
                  )
                }
              >
                <Undo2 className="size-4" /> Reabrir
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() =>
                rodar(
                  () => excluirTarefa(tarefa.id),
                  "Não deu para excluir."
                )
              }
            >
              <Trash2 className="size-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
