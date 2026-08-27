import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { vendedores } from "@/db/schema";
import { exigirUsuario, veFunilInteiro } from "@/lib/auth";
import { buscarTarefas } from "@/lib/tarefas-consulta";
import { gavetaDaTarefa } from "@/lib/tarefas";
import { Button } from "@/components/ui/button";
import { ListaTarefas } from "./lista-tarefas";
import { TarefaDialog } from "./tarefa-dialog";

export const metadata = { title: "Tarefas" };

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  const usuario = await exigirUsuario();
  const veTudo = veFunilInteiro(usuario.papel);
  const escopo = veTudo ? null : usuario.vendedorId ?? null;

  const mostrarConcluidas = ver === "concluidas";

  const todas = await buscarTarefas({
    vendedorId: escopo,
    apenasPendentes: !mostrarConcluidas,
  });
  // Na visão de concluídas, só as concluídas — senão viram duas listas.
  const tarefas = mostrarConcluidas
    ? todas.filter((t) => t.status !== "pendente")
    : todas;

  const responsaveis = veTudo
    ? (
        await db
          .select({ id: vendedores.id, nome: vendedores.nome, papel: vendedores.papel })
          .from(vendedores)
          .where(eq(vendedores.ativo, true))
          .orderBy(asc(vendedores.nome))
      )
        .filter((v) => v.papel !== "atendente")
        .map((v) => ({ id: v.id, nome: v.nome }))
    : [];

  const pendentes = todas.filter((t) => t.status === "pendente");
  const atrasadas = pendentes.filter(
    (t) => gavetaDaTarefa(t.previstaEm) === "atrasada"
  ).length;
  const hoje = pendentes.filter(
    (t) => gavetaDaTarefa(t.previstaEm) === "hoje"
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground">
            {mostrarConcluidas
              ? "O que já foi feito."
              : atrasadas + hoje === 0
                ? "Nada vencendo hoje."
                : `${atrasadas > 0 ? `${atrasadas} atrasada${atrasadas > 1 ? "s" : ""}` : ""}${
                    atrasadas > 0 && hoje > 0 ? " · " : ""
                  }${hoje > 0 ? `${hoje} para hoje` : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={mostrarConcluidas ? "/tarefas" : "/tarefas?ver=concluidas"} />
            }
          >
            {mostrarConcluidas ? "Ver pendentes" : "Ver concluídas"}
          </Button>
          <TarefaDialog
            responsaveis={responsaveis}
            trigger={<Button>Nova tarefa</Button>}
          />
        </div>
      </div>

      <ListaTarefas
        tarefas={tarefas}
        responsaveis={responsaveis}
        vazio={
          mostrarConcluidas
            ? "Nenhuma tarefa concluída ainda."
            : "Nenhuma tarefa pendente. Quando um orçamento for enviado, o follow-up aparece aqui sozinho."
        }
      />
    </div>
  );
}
