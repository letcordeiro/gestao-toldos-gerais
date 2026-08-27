import { asc } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import { resumos } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";
import { emailConfigurado } from "@/lib/email";
import {
  BLOCOS,
  FREQUENCIA_LABEL,
  lerBlocos,
  lerDestinatarios,
} from "@/lib/resumo";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResumoDialog } from "./resumo-dialog";
import {
  AtivoResumoSwitch,
  EnviarAgoraButton,
  ExcluirResumoButton,
} from "./acoes-resumo";

export const metadata = { title: "Resumo por e-mail" };

export default async function ResumosPage() {
  await exigirGestor();

  const lista = await db.select().from(resumos).orderBy(asc(resumos.id));
  const nomeBloco = new Map(BLOCOS.map((b) => [b.chave, b.nome]));
  const temSmtp = emailConfigurado();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Resumo por e-mail
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            O sistema mandando notícia em vez de esperar alguém abrir a tela:
            tarefas do dia, orçamentos sem resposta, instalações, parcelas
            vencidas e os números do funil.
          </p>
        </div>
        <ResumoDialog trigger={<Button>Novo resumo</Button>} />
      </div>

      {!temSmtp && (
        <div className="rounded-lg border border-brand-orange/40 bg-brand-orange/5 p-3 text-sm">
          <p className="font-semibold">Envio de e-mail não configurado</p>
          <p className="text-muted-foreground">
            Falta preencher <code>SMTP_HOST</code>, <code>SMTP_USER</code> e{" "}
            <code>SMTP_PASS</code> nas variáveis de ambiente. Sem isso o resumo
            é montado mas não sai.
          </p>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resumo</TableHead>
              <TableHead className="hidden md:table-cell">Conteúdo</TableHead>
              <TableHead className="w-40">Último envio</TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-56" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum resumo cadastrado.
                </TableCell>
              </TableRow>
            )}
            {lista.map((r) => {
              const blocos = lerBlocos(r.blocos);
              const destinatarios = lerDestinatarios(r.destinatarios);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.nome}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {FREQUENCIA_LABEL[r.frequencia]} ·{" "}
                      {destinatarios.length === 1
                        ? destinatarios[0].email
                        : `${destinatarios.length} destinatários`}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {blocos.map((b) => nomeBloco.get(b)).join(" · ")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.ultimoEnvioEm
                      ? format(r.ultimoEnvioEm, "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })
                      : "nunca"}
                  </TableCell>
                  <TableCell>
                    <AtivoResumoSwitch id={r.id} ativo={r.ativo} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <EnviarAgoraButton id={r.id} />
                    <ResumoDialog
                      resumo={{
                        id: r.id,
                        nome: r.nome,
                        frequencia: r.frequencia,
                        blocos,
                        destinatarios,
                        mensagem: r.mensagem,
                      }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      }
                    />
                    <ExcluirResumoButton id={r.id} nome={r.nome} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        O envio é disparado por um cron que chama{" "}
        <code>POST /api/resumos</code> com o token do servidor. A rota confere a
        frequência de cada resumo, então chamar mais de uma vez por dia não
        manda e-mail repetido.
      </p>
    </div>
  );
}
