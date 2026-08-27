import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ordenarLista } from "@/lib/ordenacao";
import { ColunaOrdenavel } from "@/components/shared/coluna-ordenavel";
import { avisos } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";
import { GATILHO_LABEL } from "@/lib/avisos";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AvisoDialog } from "./aviso-dialog";
import { AtivoAvisoSwitch } from "./ativo-switch";
import { ExcluirAvisoButton } from "./excluir-aviso-button";

export const metadata = { title: "Avisos" };


export default async function AvisosPage({
  searchParams,
}: {
  searchParams: Promise<{ ordem?: string; dir?: string }>;
}) {
  const { ordem, dir } = await searchParams;
  await exigirGestor();

  const todos = await db.select().from(avisos).orderBy(asc(avisos.id));
  const linhas = ordenarLista(todos, ordem, dir, {
    nome: (a) => a.nome,
    quando: (a) => a.dias,
    ativo: (a) => (a.ativo ? 0 : 1),
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
      base="/cadastros/avisos"
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
        <div>
          <Link
            href="/atendimentos"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Atendimentos
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Avisos</h1>
          <p className="text-sm text-muted-foreground">
            Notificações de WhatsApp que aparecem no topo da tela de
            Atendimentos.
          </p>
        </div>
        <AvisoDialog trigger={<Button>Novo aviso</Button>} />
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <Coluna chave="nome">Nome</Coluna>
              <Coluna chave="quando" className="hidden md:table-cell">
                Quando
              </Coluna>
              <TableHead className="hidden lg:table-cell">Mensagem</TableHead>
              <TableHead className="hidden sm:table-cell">
                Depois do &quot;já contatei&quot;
              </TableHead>
              <Coluna chave="ativo">Ativo</Coluna>
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
                  Nenhum aviso cadastrado.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((aviso) => (
              <TableRow
                key={aviso.id}
                className={aviso.ativo ? "" : "opacity-50"}
              >
                <TableCell className="font-medium">
                  {aviso.nome}
                  <span className="block text-xs font-normal text-muted-foreground md:hidden">
                    {aviso.dias} dias após {GATILHO_LABEL[aviso.gatilho]}
                  </span>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {aviso.dias} dias após {GATILHO_LABEL[aviso.gatilho]}
                </TableCell>
                <TableCell className="hidden max-w-xs truncate text-muted-foreground lg:table-cell">
                  {aviso.mensagem}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {aviso.rearmeDias != null
                    ? `avisa de novo em ${aviso.rearmeDias} dias`
                    : "não avisa de novo"}
                </TableCell>
                <TableCell>
                  <AtivoAvisoSwitch id={aviso.id} ativo={aviso.ativo} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <AvisoDialog
                    aviso={aviso}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <ExcluirAvisoButton avisoId={aviso.id} nome={aviso.nome} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
