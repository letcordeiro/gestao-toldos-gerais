import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fases, gatilhos, tarefas } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";
import { descreverGatilho } from "@/lib/gatilhos";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GatilhoDialog } from "./gatilho-dialog";
import { AtivoGatilhoSwitch, ExcluirGatilhoButton } from "./acoes-gatilho";

export const metadata = { title: "Automações" };

export default async function GatilhosPage() {
  await exigirGestor();

  const todas = await db.select().from(gatilhos).orderBy(asc(gatilhos.id));
  const listaFases = await db
    .select({ id: fases.id, nome: fases.nome })
    .from(fases)
    .orderBy(asc(fases.ordem));
  const nomeFase = new Map(listaFases.map((f) => [f.id, f.nome]));

  // Quantas tarefas cada regra já criou — mostra se a automação está viva.
  const criadas = await db
    .select({ gatilhoId: tarefas.gatilhoId })
    .from(tarefas)
    .where(eq(tarefas.status, "pendente"));
  const pendentesPorGatilho = new Map<number, number>();
  for (const t of criadas) {
    if (t.gatilhoId != null) {
      pendentesPorGatilho.set(
        t.gatilhoId,
        (pendentesPorGatilho.get(t.gatilhoId) ?? 0) + 1
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automações</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Regras do tipo “quando isso acontecer, crie essa tarefa”. É o que
            faz o follow-up aparecer sozinho na tela de Tarefas, sem depender de
            alguém lembrar.
          </p>
        </div>
        <GatilhoDialog
          fases={listaFases}
          trigger={<Button>Nova automação</Button>}
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Automação</TableHead>
              <TableHead className="hidden md:table-cell">Regra</TableHead>
              <TableHead className="w-24">Pendentes</TableHead>
              <TableHead className="w-20">Ativa</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {todas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhuma automação ainda.
                </TableCell>
              </TableRow>
            )}
            {todas.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">
                  {g.nome}
                  <span className="block text-xs font-normal text-muted-foreground md:hidden">
                    {descreverGatilho(g, nomeFase.get(g.faseId ?? -1))}
                  </span>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {descreverGatilho(g, nomeFase.get(g.faseId ?? -1))}
                </TableCell>
                <TableCell className="tabular-nums">
                  {pendentesPorGatilho.get(g.id) ?? 0}
                </TableCell>
                <TableCell>
                  <AtivoGatilhoSwitch id={g.id} ativo={g.ativo} />
                </TableCell>
                <TableCell className="text-right">
                  <GatilhoDialog
                    gatilho={g}
                    fases={listaFases}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <ExcluirGatilhoButton id={g.id} nome={g.nome} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
