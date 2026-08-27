import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { ordenarLista } from "@/lib/ordenacao";
import { ColunaOrdenavel } from "@/components/shared/coluna-ordenavel";
import { atendimentos, fases } from "@/db/schema";
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
import { FaseDialog } from "./fase-dialog";
import { ExcluirFaseButton } from "./excluir-fase-button";

export const metadata = { title: "Fases do funil" };


function Marca({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export default async function FasesPage({
  searchParams,
}: {
  searchParams: Promise<{ ordem?: string; dir?: string }>;
}) {
  const { ordem, dir } = await searchParams;
  await exigirGestor();
  const todas = await db
    .select({
      id: fases.id,
      nome: fases.nome,
      ordem: fases.ordem,
      cor: fases.cor,
      liberaInstalacao: fases.liberaInstalacao,
      exibirNaListagem: fases.exibirNaListagem,
      terminal: fases.terminal,
      ehPerdido: fases.ehPerdido,
      emUso: count(atendimentos.id),
    })
    .from(fases)
    .leftJoin(atendimentos, eq(atendimentos.faseId, fases.id))
    .groupBy(fases.id)
    .orderBy(asc(fases.ordem));
  // A ordem do funil é a ordenação natural desta tela; as colunas só mudam a
  // visão, não o campo `ordem` (esse continua sendo editado na própria linha).
  const linhas = ordenarLista(todas, ordem, dir, {
    posicao: (f) => f.ordem,
    nome: (f) => f.nome,
    atendimentos: (f) => f.emUso,
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
      base="/cadastros/fases"
      chave={chave}
      ordem={ordem}
      dir={dir}
      className={className}
    >
      {children}
    </ColunaOrdenavel>
  );


  const proximaOrdem =
    linhas.reduce((max, fase) => Math.max(max, fase.ordem), 0) + 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Fases do funil
        </h1>
        <FaseDialog
          proximaOrdem={proximaOrdem}
          trigger={<Button>Nova fase</Button>}
        />
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <Coluna chave="posicao" className="w-16">
                Ordem
              </Coluna>
              <Coluna chave="nome">Nome</Coluna>
              <TableHead className="hidden md:table-cell">O que faz</TableHead>
              <Coluna chave="atendimentos">Atendimentos</Coluna>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((fase) => (
              <TableRow key={fase.id}>
                <TableCell className="text-muted-foreground">
                  {fase.ordem}
                </TableCell>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: fase.cor }}
                    />
                    {fase.nome}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="flex flex-wrap gap-1">
                    {fase.exibirNaListagem || (
                      <Marca>fora da lista padrão</Marca>
                    )}
                    {fase.liberaInstalacao && <Marca>negócio fechado</Marca>}
                    {fase.terminal && <Marca>encerra</Marca>}
                    {fase.ehPerdido && <Marca>perdido</Marca>}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fase.emUso}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <FaseDialog
                    fase={fase}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <ExcluirFaseButton faseId={fase.id} nome={fase.nome} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
