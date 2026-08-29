import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ordenarLista } from "@/lib/ordenacao";
import { ColunaOrdenavel } from "@/components/shared/coluna-ordenavel";
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
import { RedefinirSenhaDialog } from "./redefinir-senha-dialog";

export const metadata = { title: "Usuários" };


const PAPEL_TITULO: Record<"gestor" | "atendente" | "vendedor", string> = {
  gestor: "Gestor",
  atendente: "Atendente",
  vendedor: "Vendedor",
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ ordem?: string; dir?: string }>;
}) {
  const { ordem, dir } = await searchParams;
  await exigirGestor();
  const todos = await db
    .select()
    .from(vendedores)
    .orderBy(asc(vendedores.nome));
  const linhas = ordenarLista(todos, ordem, dir, {
    nome: (v) => v.nome,
    email: (v) => v.email,
    // Papel ordena pelo alcance do acesso: gestor, atendente, vendedor.
    papel: (v) => ["gestor", "atendente", "vendedor"].indexOf(v.papel),
    acesso: (v) => (v.senhaHash ? 0 : 1),
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
      base="/cadastros/usuarios"
      chave={chave}
      ordem={ordem}
      dir={dir}
      className={className}
    >
      {children}
    </ColunaOrdenavel>
  );


  const signupToken = process.env.VENDEDOR_SIGNUP_TOKEN;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <VendedorDialog trigger={<Button>Novo usuário</Button>} />
      </div>
      {signupToken && <LinkCadastroVendedor token={signupToken} />}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <Coluna chave="nome">Nome</Coluna>
              <Coluna chave="email" className="hidden md:table-cell">
                E-mail
              </Coluna>
              <Coluna chave="papel">Papel</Coluna>
              <Coluna chave="acesso">Acesso</Coluna>
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
                      vendedor.papel === "gestor"
                        ? "default"
                        : vendedor.papel === "atendente"
                          ? "outline"
                          : "secondary"
                    }
                  >
                    {PAPEL_TITULO[vendedor.papel]}
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
                  <RedefinirSenhaDialog
                    usuarioId={vendedor.id}
                    nome={vendedor.nome}
                    temEmail={Boolean(vendedor.email?.trim())}
                    temAcesso={Boolean(vendedor.senhaHash)}
                  />
                  <VendedorDialog
                    vendedor={{
                      id: vendedor.id,
                      nome: vendedor.nome,
                      whatsapp: vendedor.whatsapp,
                      telefoneFixo: vendedor.telefoneFixo,
                      linkAgendamento: vendedor.linkAgendamento,
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
