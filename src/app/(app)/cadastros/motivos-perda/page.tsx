import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, motivosPerda } from "@/db/schema";
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
import { MotivoDialog } from "./motivo-dialog";
import { AtivoMotivoSwitch, ExcluirMotivoButton } from "./acoes-motivo";

export const metadata = { title: "Motivos de perda" };

export default async function MotivosPerdaPage() {
  await exigirGestor();

  const lista = await db
    .select()
    .from(motivosPerda)
    .orderBy(asc(motivosPerda.ordem), asc(motivosPerda.id));

  const usos = await db
    .select({
      motivoId: atendimentos.motivoPerdaId,
      n: sql<number>`count(*)`,
    })
    .from(atendimentos)
    .groupBy(atendimentos.motivoPerdaId);
  const porMotivo = new Map(usos.map((u) => [u.motivoId, u.n]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Motivos de perda
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Escolhidos na hora de marcar o atendimento como perdido. Cadastro
            fechado de propósito: texto livre nunca soma no relatório.
          </p>
        </div>
        <MotivoDialog trigger={<Button>Novo motivo</Button>} />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motivo</TableHead>
              <TableHead className="w-28">Usos</TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum motivo cadastrado.
                </TableCell>
              </TableRow>
            )}
            {lista.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.nome}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {porMotivo.get(m.id) ?? 0}
                </TableCell>
                <TableCell>
                  <AtivoMotivoSwitch id={m.id} ativo={m.ativo} />
                </TableCell>
                <TableCell className="text-right">
                  <MotivoDialog
                    motivo={m}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <ExcluirMotivoButton id={m.id} nome={m.nome} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
