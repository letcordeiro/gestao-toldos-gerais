import { asc } from "drizzle-orm";
import { db } from "@/db";
import { vendedores } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";
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
import { AtivoVendedorSwitch } from "./ativo-switch";
import { VendedorDialog } from "./vendedor-dialog";
import { LinkCadastroVendedor } from "./link-cadastro-vendedor";

export default async function VendedoresPage() {
  await exigirGestor();
  const linhas = await db
    .select()
    .from(vendedores)
    .orderBy(asc(vendedores.nome));
  const signupToken = process.env.VENDEDOR_SIGNUP_TOKEN;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Vendedores</h1>
        <VendedorDialog trigger={<Button>Novo vendedor</Button>} />
      </div>
      {signupToken && <LinkCadastroVendedor token={signupToken} />}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum vendedor cadastrado.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((vendedor) => (
              <TableRow
                key={vendedor.id}
                className={vendedor.ativo ? "" : "opacity-50"}
              >
                <TableCell className="font-medium">{vendedor.nome}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {vendedor.email}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      vendedor.papel === "gestor" ? "default" : "secondary"
                    }
                  >
                    {vendedor.papel === "gestor" ? "Gestor" : "Vendedor"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {vendedor.senhaHash ? (
                    <span className="text-primary">✓ tem login</span>
                  ) : (
                    <span className="text-muted-foreground">sem login</span>
                  )}
                </TableCell>
                <TableCell>
                  <AtivoVendedorSwitch id={vendedor.id} ativo={vendedor.ativo} />
                </TableCell>
                <TableCell className="text-right">
                  <VendedorDialog
                    vendedor={{
                      id: vendedor.id,
                      nome: vendedor.nome,
                      whatsapp: vendedor.whatsapp,
                      telefoneFixo: vendedor.telefoneFixo,
                      email: vendedor.email,
                      temAcesso: Boolean(vendedor.senhaHash),
                      papel: vendedor.papel,
                    }}
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
