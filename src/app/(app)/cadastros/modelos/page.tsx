import { asc } from "drizzle-orm";
import { db } from "@/db";
import { modelosToldo } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
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
  const usuario = await exigirUsuario();
  const ehGestor = usuario.papel === "gestor";
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
        {ehGestor ? (
          <ModeloDialog trigger={<Button>Novo modelo</Button>} />
        ) : (
          <Badge variant="secondary">Somente consulta</Badge>
        )}
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
              {ehGestor && <TableHead className="w-0" />}
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
                  {ehGestor ? (
                    <AtivoSwitch id={modelo.id} ativo={modelo.ativo} />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {modelo.ativo ? "Sim" : "Não"}
                    </span>
                  )}
                </TableCell>
                {ehGestor && (
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
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
