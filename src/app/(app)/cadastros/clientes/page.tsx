import Link from "next/link";
import { asc, like, or } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { cn } from "@/lib/utils";
import { ordenarLista } from "@/lib/ordenacao";
import { ColunaOrdenavel } from "@/components/shared/coluna-ordenavel";
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

export const metadata = { title: "Clientes" };


type Filtro = "ativos" | "inativos" | "todos";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string; ordem?: string; dir?: string }>;
}) {
  const { q, filtro: filtroParam, ordem, dir } = await searchParams;
  const filtro: Filtro =
    filtroParam === "inativos" || filtroParam === "todos"
      ? filtroParam
      : "ativos";

  const todos = await db
    .select()
    .from(clientes)
    .where(
      q
        ? or(like(clientes.nome, `%${q}%`), like(clientes.telefone, `%${q}%`))
        : undefined
    )
    .orderBy(asc(clientes.nome));

  const ativos = todos.filter((c) => c.ativo);
  const inativos = todos.filter((c) => !c.ativo);
  const daAba =
    filtro === "ativos" ? ativos : filtro === "inativos" ? inativos : todos;
  const linhas = ordenarLista(daAba, ordem, dir, {
    nome: (c) => c.nome,
    telefone: (c) => c.telefone,
    cidade: (c) => c.cidade,
    origem: (c) => c.origem,
    criado: (c) => c.criadoEm,
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
      base="/cadastros/clientes"
      chave={chave}
      ordem={ordem}
      dir={dir}
      extras={{ q, filtro: filtroParam }}
      className={className}
    >
      {children}
    </ColunaOrdenavel>
  );

  const abas: { chave: Filtro; rotulo: string; total: number }[] = [
    { chave: "ativos", rotulo: "Ativos", total: ativos.length },
    { chave: "inativos", rotulo: "Inativos", total: inativos.length },
    { chave: "todos", rotulo: "Todos", total: todos.length },
  ];
  const hrefAba = (chave: Filtro) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (chave !== "ativos") params.set("filtro", chave);
    const query = params.toString();
    return query ? `/cadastros/clientes?${query}` : "/cadastros/clientes";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <ClienteDialog trigger={<Button>Novo cliente</Button>} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <BuscaClientes q={q} filtro={filtro} />
        <div className="flex rounded-lg border bg-card p-1">
          {abas.map((aba) => (
            <Link
              key={aba.chave}
              href={hrefAba(aba.chave)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                filtro === aba.chave
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {aba.rotulo} ({aba.total})
            </Link>
          ))}
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <Coluna chave="nome">Nome</Coluna>
              <Coluna chave="telefone" className="hidden sm:table-cell">
                Telefone
              </Coluna>
              <Coluna chave="cidade" className="hidden md:table-cell">
                Cidade
              </Coluna>
              <Coluna chave="origem" className="hidden md:table-cell">
                Origem
              </Coluna>
              <Coluna chave="criado" className="hidden lg:table-cell">
                Criado em
              </Coluna>
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
                  {filtro === "inativos"
                    ? "Nenhum cliente inativo."
                    : "Nenhum cliente encontrado."}
                </TableCell>
              </TableRow>
            )}
            {linhas.map((cliente) => (
              <TableRow
                key={cliente.id}
                className={cliente.ativo ? "" : "bg-muted/40 opacity-60"}
              >
                <TableCell className="font-medium">
                  <Link
                    href={`/cadastros/clientes/${cliente.id}`}
                    className="text-primary hover:underline"
                  >
                    {cliente.nome}
                  </Link>
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
                  <Button
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/cadastros/clientes/${cliente.id}`} />}
                  >
                    Histórico
                  </Button>
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
