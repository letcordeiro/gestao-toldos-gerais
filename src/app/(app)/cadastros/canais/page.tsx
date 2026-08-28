import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, canais, fases } from "@/db/schema";
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
import { CanalDialog } from "./canal-dialog";
import { AtivoCanalSwitch, ExcluirCanalButton } from "./acoes-canal";

export const metadata = { title: "Canais de origem" };

export default async function CanaisPage() {
  await exigirGestor();

  const lista = await db
    .select()
    .from(canais)
    .orderBy(asc(canais.ordem), asc(canais.id));

  // Leads e fechamentos por canal — é o que transforma o cadastro em decisão
  // de onde gastar divulgação.
  const uso = await db
    .select({
      canalId: atendimentos.canalId,
      leads: sql<number>`count(*)`,
      fechados: sql<number>`sum(case when ${fases.liberaInstalacao} then 1 else 0 end)`,
    })
    .from(atendimentos)
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .groupBy(atendimentos.canalId)
    .orderBy(desc(sql`count(*)`));
  const porCanal = new Map(uso.map((u) => [u.canalId, u]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Canais de origem
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Por onde o cliente chegou. Cruzado com a conversão, responde a
            pergunta que importa: qual canal traz cliente que fecha.
          </p>
        </div>
        <CanalDialog trigger={<Button>Novo canal</Button>} />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHead className="sr-only">Canais</TableHead>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead className="w-28">Leads</TableHead>
              <TableHead className="w-28">Fecharam</TableHead>
              <TableHead className="hidden w-36 sm:table-cell">
                No cadastro público
              </TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((c) => {
              const u = porCanal.get(c.id);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {u?.leads ?? 0}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {u?.fechados ?? 0}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {c.noCadastroPublico ? "Sim" : "Não"}
                  </TableCell>
                  <TableCell>
                    <AtivoCanalSwitch id={c.id} ativo={c.ativo} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <CanalDialog
                      canal={c}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      }
                    />
                    <ExcluirCanalButton id={c.id} nome={c.nome} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
