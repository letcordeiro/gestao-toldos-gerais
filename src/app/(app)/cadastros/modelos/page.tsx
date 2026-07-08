import { asc } from "drizzle-orm";
import { db } from "@/db";
import { modelosToldo } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AtivoSwitch } from "./ativo-switch";
import { ModeloDialog } from "./modelo-dialog";

export default async function ModelosPage() {
  const linhas = await db
    .select()
    .from(modelosToldo)
    .orderBy(asc(modelosToldo.nome));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Modelos de toldo
        </h1>
        <ModeloDialog trigger={<Button>Novo modelo</Button>} />
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">
                Descrição do material
              </TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((modelo) => (
              <TableRow
                key={modelo.id}
                className={modelo.ativo ? "" : "opacity-50"}
              >
                <TableCell className="font-medium">{modelo.nome}</TableCell>
                <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">
                  {modelo.descricaoMaterial ?? (
                    <span className="italic">completar com o João</span>
                  )}
                </TableCell>
                <TableCell>
                  <AtivoSwitch id={modelo.id} ativo={modelo.ativo} />
                </TableCell>
                <TableCell className="text-right">
                  <ModeloDialog
                    modelo={modelo}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
