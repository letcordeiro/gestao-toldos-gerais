import { asc, like, or } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import { clientes } from "@/db/schema";
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
import { BuscaClientes } from "./busca";
import { ClienteDialog } from "./cliente-dialog";
import { ExcluirClienteButton } from "./excluir-cliente-button";
import { AtivoClienteSwitch } from "./ativo-switch";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const linhas = await db
    .select()
    .from(clientes)
    .where(
      q
        ? or(like(clientes.nome, `%${q}%`), like(clientes.telefone, `%${q}%`))
        : undefined
    )
    .orderBy(asc(clientes.nome));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <ClienteDialog trigger={<Button>Novo cliente</Button>} />
      </div>
      <BuscaClientes q={q} />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Telefone</TableHead>
              <TableHead className="hidden md:table-cell">Cidade</TableHead>
              <TableHead className="hidden md:table-cell">Origem</TableHead>
              <TableHead className="hidden lg:table-cell">Criado em</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((cliente) => (
              <TableRow key={cliente.id} className={cliente.ativo ? "" : "opacity-50"}>
                <TableCell className="font-medium">
                  {cliente.nome}
                  <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                    {cliente.telefone}
                  </span>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {cliente.telefone}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {cliente.cidade}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="secondary">
                    {cliente.origem === "auto_cadastro"
                      ? "Auto-cadastro"
                      : "Interno"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {format(cliente.criadoEm, "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  <AtivoClienteSwitch id={cliente.id} ativo={cliente.ativo} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <ClienteDialog
                    cliente={cliente}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <ExcluirClienteButton
                    clienteId={cliente.id}
                    nome={cliente.nome}
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
