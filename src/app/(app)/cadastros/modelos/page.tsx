import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ordenarLista } from "@/lib/ordenacao";
import { ColunaOrdenavel } from "@/components/shared/coluna-ordenavel";
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
import { VerModeloDialog } from "./ver-modelo-dialog";
import { ExcluirModeloButton } from "./excluir-modelo-button";

export const metadata = { title: "Modelos de toldo" };


export default async function ModelosPage({
  searchParams,
}: {
  searchParams: Promise<{ ordem?: string; dir?: string }>;
}) {
  const { ordem, dir } = await searchParams;
  const usuario = await exigirUsuario();
  const ehGestor = usuario.papel === "gestor";
  const todos = await db
    .select()
    .from(modelosToldo)
    .orderBy(asc(modelosToldo.nome));
  const linhas = ordenarLista(todos, ordem, dir, {
    nome: (m) => m.nome,
    ativo: (m) => (m.ativo ? 0 : 1),
  });

  const Coluna = ({
    chave,
    className,
    children,
  }: {
    chave: string;
    className?: string;
    children: React.ReactNode;
  }) => (
    <ColunaOrdenavel
      base="/cadastros/modelos"
      chave={chave}
      ordem={ordem}
      dir={dir}
      className={className}
    >
      {children}
    </ColunaOrdenavel>
  );



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
              <Coluna chave="nome">Nome</Coluna>
              <TableHead className="hidden md:table-cell">
                Descrição do material
              </TableHead>
              <Coluna chave="ativo">Ativo</Coluna>
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
                  {ehGestor ? (
                    <AtivoSwitch id={modelo.id} ativo={modelo.ativo} />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {modelo.ativo ? "Sim" : "Não"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <VerModeloDialog
                      modelo={modelo}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      }
                    />
                    {ehGestor && (
                      <>
                        <ModeloDialog
                          modelo={modelo}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Editar
                            </Button>
                          }
                        />
                        <ExcluirModeloButton
                          modeloId={modelo.id}
                          nome={modelo.nome}
                        />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
