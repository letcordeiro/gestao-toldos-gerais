import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { instalacaoEquipe, instaladores } from "@/db/schema";
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
import { InstaladorDialog } from "./instalador-dialog";
import {
  AtivoInstaladorSwitch,
  ExcluirInstaladorButton,
} from "./acoes-instalador";

export const metadata = { title: "Instaladores" };

export default async function InstaladoresPage() {
  await exigirGestor();

  const lista = await db
    .select()
    .from(instaladores)
    .orderBy(asc(instaladores.nome));

  const obras = await db
    .select({
      instaladorId: instalacaoEquipe.instaladorId,
      n: sql<number>`count(*)`,
    })
    .from(instalacaoEquipe)
    .groupBy(instalacaoEquipe.instaladorId);
  const porInstalador = new Map(obras.map((o) => [o.instaladorId, o.n]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instaladores</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Quem vai na obra. A comissão padrão vem preenchida quando você monta
            a equipe na ficha de instalação, e pode ser trocada por obra.
          </p>
        </div>
        <InstaladorDialog trigger={<Button>Novo instalador</Button>} />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instalador</TableHead>
              <TableHead className="hidden sm:table-cell">WhatsApp</TableHead>
              <TableHead className="w-32">Comissão</TableHead>
              <TableHead className="w-24">Obras</TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum instalador cadastrado.
                </TableCell>
              </TableRow>
            )}
            {lista.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell className="hidden text-sm sm:table-cell">
                  {i.telefone && (
                    <a
                      href={linkWhatsApp(i.telefone)}
                      target="_blank"
                      rel="noopener"
                      className="text-primary hover:underline"
                    >
                      {i.telefone}
                    </a>
                  )}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {i.comissaoPadraoPercent
                    ? `${i.comissaoPadraoPercent}%`
                    : "—"}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {porInstalador.get(i.id) ?? 0}
                </TableCell>
                <TableCell>
                  <AtivoInstaladorSwitch id={i.id} ativo={i.ativo} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <InstaladorDialog
                    instalador={i}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <ExcluirInstaladorButton id={i.id} nome={i.nome} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
