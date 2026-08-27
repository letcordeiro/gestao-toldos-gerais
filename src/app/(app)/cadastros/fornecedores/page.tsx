import { asc } from "drizzle-orm";
import { db } from "@/db";
import { fornecedores } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";
import { linkWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FornecedorDialog } from "./fornecedor-dialog";
import {
  AtivoFornecedorSwitch,
  ExcluirFornecedorButton,
} from "./acoes-fornecedor";

export const metadata = { title: "Fornecedores" };

export default async function FornecedoresPage() {
  await exigirGestor();

  const lista = await db
    .select()
    .from(fornecedores)
    .orderBy(asc(fornecedores.nome));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fornecedores</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Quem recebe as cotações de material. O campo “o que fornece” é o que
            ajuda a escolher quem chamar para cada cotação.
          </p>
        </div>
        <FornecedorDialog trigger={<Button>Novo fornecedor</Button>} />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="hidden md:table-cell">Fornece</TableHead>
              <TableHead className="hidden sm:table-cell">Contato</TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum fornecedor cadastrado.
                </TableCell>
              </TableRow>
            )}
            {lista.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">
                  {f.nome}
                  {f.fornece && (
                    <span className="block text-xs font-normal text-muted-foreground md:hidden">
                      {f.fornece}
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {f.fornece}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  {f.contato}
                  {f.telefone && (
                    <a
                      href={linkWhatsApp(f.telefone)}
                      target="_blank"
                      rel="noopener"
                      className="ml-2 text-primary hover:underline"
                    >
                      {f.telefone}
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <AtivoFornecedorSwitch id={f.id} ativo={f.ativo} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <FornecedorDialog
                    fornecedor={f}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <ExcluirFornecedorButton id={f.id} nome={f.nome} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
