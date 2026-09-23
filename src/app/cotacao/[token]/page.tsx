import Image from "next/image";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import {
  cotacaoFornecedores,
  cotacaoItens,
  cotacaoRespostas,
  cotacoes,
  fornecedores,
} from "@/db/schema";
import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";
import { centavosParaInput } from "@/lib/format";
import { FormCotacao } from "./form-cotacao";

export const metadata = {
  title: "Pedido de cotação",
  robots: { index: false },
};

// Fuso fixo de propósito: o servidor roda em UTC, e o format() do date-fns
// mostraria a hora com 3h a mais para quem está em Belo Horizonte.
function quandoRespondeu(data: Date): string {
  const opcoes = { timeZone: "America/Sao_Paulo" } as const;
  const dia = data.toLocaleDateString("pt-BR", opcoes);
  const hora = data.toLocaleTimeString("pt-BR", {
    ...opcoes,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dia} às ${hora}`;
}

// Página PÚBLICA do fornecedor — a trava é o token do link.
export default async function CotacaoPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [linha] = await db
    .select({
      convite: cotacaoFornecedores,
      cotacao: cotacoes,
      fornecedorNome: fornecedores.nome,
    })
    .from(cotacaoFornecedores)
    .innerJoin(cotacoes, eq(cotacaoFornecedores.cotacaoId, cotacoes.id))
    .innerJoin(
      fornecedores,
      eq(cotacaoFornecedores.fornecedorId, fornecedores.id)
    )
    .where(eq(cotacaoFornecedores.token, token));

  // Nada de notFound(): a página 404 do sistema oferece "Ir para o início",
  // que cai no login — e o fornecedor não tem login. Aqui ele ganha um contato.
  if (!linha) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm space-y-2 text-center">
          <p className="text-lg font-semibold">Cotação não encontrada.</p>
          <p className="text-sm text-muted-foreground">
            O link pode estar incorreto. Fale com a gente pelo WhatsApp{" "}
            <a
              href={linkWhatsApp(EMPRESA.whatsapp)}
              target="_blank"
              rel="noopener"
              className="whitespace-nowrap font-medium text-primary underline"
            >
              {EMPRESA.whatsapp}
            </a>
            , pelo fixo{" "}
            <span className="whitespace-nowrap">{EMPRESA.telefoneFixo}</span> ou por e-mail em{" "}
            {EMPRESA.emailVendas}.
          </p>
        </div>
      </main>
    );
  }
  const { convite, cotacao } = linha;

  const itens = await db
    .select()
    .from(cotacaoItens)
    .where(eq(cotacaoItens.cotacaoId, cotacao.id))
    .orderBy(asc(cotacaoItens.ordem));

  const respostas = await db
    .select()
    .from(cotacaoRespostas)
    .where(eq(cotacaoRespostas.cotacaoFornecedorId, convite.id));
  const valorPorItem = new Map(
    respostas.map((r) => [r.itemId, r.valorUnitario])
  );

  const encerrada = cotacao.situacao !== "aberta";

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt={EMPRESA.razaoSocial}
            width={110}
            height={59}
            priority
          />
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">
            Pedido de cotação
          </h1>
          <p className="text-sm text-muted-foreground">
            {linha.fornecedorNome} · {cotacao.titulo}
          </p>
          {cotacao.prazoResposta && (
            <p className="mt-1 text-sm">
              <span className="text-muted-foreground">Responder até:</span>{" "}
              <strong>
                {format(cotacao.prazoResposta, "dd/MM/yyyy", { locale: ptBR })}
              </strong>
            </p>
          )}
          {cotacao.observacoes && (
            <p className="mt-3 whitespace-pre-line rounded-md bg-secondary p-3 text-sm">
              {cotacao.observacoes}
            </p>
          )}

          <div className="mt-5">
            {encerrada ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Esta cotação já foi encerrada. Obrigado!
              </p>
            ) : (
              <>
                {/* Sem isto o fornecedor que abria o link de novo não sabia se
                    a cotação tinha chegado — e respondia outra vez por via das
                    dúvidas, ou ligava para perguntar. */}
                {convite.respondidoEm && (
                  <p className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                    Recebemos sua cotação em{" "}
                    <strong>{quandoRespondeu(convite.respondidoEm)}</strong>
                    . Se quiser corrigir algum preço, é só alterar e enviar de
                    novo.
                  </p>
                )}
                <FormCotacao
                  token={token}
                  itens={itens.map((i) => ({
                    id: i.id,
                    descricao: i.descricao,
                    quantidade: i.quantidade,
                    unidade: i.unidade,
                    valorAtual: centavosParaInput(
                      valorPorItem.get(i.id) ?? null
                    ),
                  }))}
                  prazoInicial={convite.prazoEntrega}
                  observacaoInicial={convite.observacao}
                />
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {EMPRESA.razaoSocial} · {EMPRESA.site}
        </p>
      </div>
    </div>
  );
}
