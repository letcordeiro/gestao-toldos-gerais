import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, fases } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FaseDialog } from "./fase-dialog";
import { ExcluirFaseButton } from "./excluir-fase-button";

export default async function FasesPage() {
  await exigirGestor();
  const linhas = await db
    .select({
      id: fases.id,
      nome: fases.nome,
      ordem: fases.ordem,
      cor: fases.cor,
      emUso: count(atendimentos.id),
    })
    .from(fases)
    .leftJoin(atendimentos, eq(atendimentos.faseId, fases.id))
    .groupBy(fases.id)
    .orderBy(asc(fases.ordem));

  const proximaOrdem =
    linhas.reduce((max, fase) => Math.max(max, fase.ordem), 0) + 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Fases do funil
        </h1>
        <FaseDialog
          proximaOrdem={proximaOrdem}
          trigger={<Button>Nova fase</Button>}
        />
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ordem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Atendimentos</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((fase) => (
              <TableRow key={fase.id}>
                <TableCell className="text-muted-foreground">
                  {fase.ordem}
                </TableCell>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: fase.cor }}
                    />
                    {fase.nome}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fase.emUso}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <FaseDialog
                    fase={fase}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <ExcluirFaseButton faseId={fase.id} nome={fase.nome} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
