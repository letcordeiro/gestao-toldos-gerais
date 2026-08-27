import { and, asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/db";
import { avisos } from "@/db/schema";
import { pendenciasDoAviso } from "@/lib/avisos";
import { formatarCentavos } from "@/lib/format";
import { buscarInstalacoes } from "@/lib/instalacoes";
import { atendimentosParados, metricasDoFunil } from "@/lib/metricas";
import { buscarTarefas } from "@/lib/tarefas-consulta";
import { gavetaDaTarefa, textoPrazo } from "@/lib/tarefas";
import { EMPRESA } from "@/lib/empresa";
import type { Bloco } from "@/lib/resumo";

export type SecaoResumo = {
  titulo: string;
  /** Linhas em texto puro; o HTML é montado a partir delas. */
  linhas: string[];
  /** Sem nada a dizer: a seção some do e-mail em vez de sair vazia. */
  vazio: boolean;
};

/** Monta uma seção por bloco escolhido. A ordem é a da lista `blocos`. */
export async function montarSecoes(blocos: Bloco[]): Promise<SecaoResumo[]> {
  const secoes: SecaoResumo[] = [];

  for (const bloco of blocos) {
    switch (bloco) {
      case "tarefas_do_dia": {
        const tarefas = await buscarTarefas({
          vendedorId: null,
          apenasPendentes: true,
        });
        const doDia = tarefas.filter((t) => {
          const g = gavetaDaTarefa(t.previstaEm);
          return g === "atrasada" || g === "hoje";
        });
        secoes.push({
          titulo: "Tarefas atrasadas e de hoje",
          linhas: doDia.map(
            (t) =>
              `${t.titulo} — ${t.clienteNome ?? "sem cliente"} (${textoPrazo(t.previstaEm)})`
          ),
          vazio: doDia.length === 0,
        });
        break;
      }

      case "orcamentos_sem_resposta": {
        const pend = await pendenciasDeAvisos("orcamento_sem_resposta");
        secoes.push({
          titulo: "Orçamentos sem resposta",
          linhas: pend,
          vazio: pend.length === 0,
        });
        break;
      }

      case "instalacoes": {
        const todas = await buscarInstalacoes(null);
        const relevantes = todas.filter(
          (i) => i.gaveta !== "proximas" || i.prevEntrega != null
        );
        secoes.push({
          titulo: "Instalações",
          linhas: relevantes.map((i) => {
            const quando = i.prevEntrega
              ? format(i.prevEntrega, "dd/MM", { locale: ptBR })
              : "sem data";
            const marca =
              i.gaveta === "atrasada"
                ? " [ATRASADA]"
                : !i.temFicha
                  ? " [sem ficha]"
                  : "";
            return `${i.clienteNome} — ${i.numero} · ${quando}${marca}`;
          }),
          vazio: relevantes.length === 0,
        });
        break;
      }

      case "parcelas_vencidas": {
        const pend = await pendenciasDeAvisos("parcela_vencida");
        secoes.push({
          titulo: "Parcelas vencidas",
          linhas: pend,
          vazio: pend.length === 0,
        });
        break;
      }

      case "contratos_sem_assinatura": {
        const pend = await pendenciasDeAvisos("contrato_sem_assinatura");
        secoes.push({
          titulo: "Contratos sem assinatura",
          linhas: pend,
          vazio: pend.length === 0,
        });
        break;
      }

      case "atendimentos_parados": {
        const parados = await atendimentosParados(null);
        secoes.push({
          titulo: "Atendimentos parados",
          linhas: parados.map(
            (p) =>
              `${p.clienteNome} — ${p.faseNome} · ${
                p.nuncaTrabalhado
                  ? "nunca trabalhado"
                  : `parado há ${p.diasParado} dias`
              }`
          ),
          vazio: parados.length === 0,
        });
        break;
      }

      case "resumo_funil": {
        const m = await metricasDoFunil(null);
        secoes.push({
          titulo: "Números do funil",
          linhas: [
            `Conversão: ${m.conversao == null ? "—" : `${m.conversao}%`} (${m.ganhos} fechado(s), ${m.perdidos} perdido(s))`,
            `Ticket médio: ${m.ticketMedio == null ? "—" : formatarCentavos(m.ticketMedio)}`,
            `Ciclo de venda: ${m.cicloMedioDias == null ? "—" : `${m.cicloMedioDias} dias`}`,
          ],
          vazio: false,
        });
        break;
      }
    }
  }

  return secoes;
}

/**
 * Pendências de todos os avisos ativos de um gatilho, já em texto.
 * Reaproveita a régua que a gestora configurou — o resumo não inventa
 * critério próprio de atraso.
 */
async function pendenciasDeAvisos(
  gatilho: "orcamento_sem_resposta" | "parcela_vencida" | "contrato_sem_assinatura"
): Promise<string[]> {
  const ativos = await db
    .select()
    .from(avisos)
    .where(and(eq(avisos.gatilho, gatilho), eq(avisos.ativo, true)))
    .orderBy(asc(avisos.dias));

  const vistos = new Set<number>();
  const linhas: string[] = [];
  for (const aviso of ativos) {
    const pendencias = await pendenciasDoAviso(aviso, null);
    for (const p of pendencias) {
      // O mesmo alvo pode cair em dois degraus da régua; conta uma vez só.
      if (vistos.has(p.alvoId)) continue;
      vistos.add(p.alvoId);
      const dias = Math.max(
        0,
        Math.round((Date.now() - p.desde.getTime()) / (24 * 60 * 60 * 1000))
      );
      linhas.push(
        [
          p.clienteNome,
          p.orcamentoNumero ? `— ${p.orcamentoNumero}` : "",
          p.valorTexto ? `· ${p.valorTexto}` : "",
          `· há ${dias} dia(s)`,
          p.vendedorNome ? `· ${p.vendedorNome}` : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
    }
  }
  return linhas;
}

function escapar(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** E-mail pronto: HTML na identidade da empresa + versão em texto puro. */
export function montarEmail({
  nome,
  secoes,
  mensagem,
  urlSistema,
}: {
  nome: string;
  secoes: SecaoResumo[];
  mensagem: string | null;
  urlSistema: string | null;
}): { assunto: string; html: string; texto: string } {
  const hoje = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
  const comConteudo = secoes.filter((s) => !s.vazio);
  const assunto = `${nome} — ${hoje}`;

  const texto = [
    `${nome} — ${hoje}`,
    "",
    mensagem ? `${mensagem}\n` : "",
    ...comConteudo.flatMap((s) => [
      `${s.titulo.toUpperCase()} (${s.linhas.length})`,
      ...s.linhas.map((l) => `  · ${l}`),
      "",
    ]),
    comConteudo.length === 0 ? "Nada pendente hoje. 👌" : "",
    urlSistema ? `Abrir o sistema: ${urlSistema}` : "",
    `${EMPRESA.razaoSocial} — ${EMPRESA.site}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1A1A1A">
  <h1 style="font-size:18px;margin:0 0 4px">${escapar(nome)}</h1>
  <p style="margin:0 0 20px;color:#6B7280;font-size:13px">${hoje}</p>
  ${mensagem ? `<p style="margin:0 0 20px">${escapar(mensagem)}</p>` : ""}
  ${
    comConteudo.length === 0
      ? `<p style="margin:0 0 20px">Nada pendente hoje. 👌</p>`
      : comConteudo
          .map(
            (s) => `
  <div style="margin:0 0 22px">
    <h2 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#004E36;margin:0 0 8px">
      ${escapar(s.titulo)} (${s.linhas.length})
    </h2>
    <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6">
      ${s.linhas.map((l) => `<li>${escapar(l)}</li>`).join("")}
    </ul>
  </div>`
          )
          .join("")
  }
  ${
    urlSistema
      ? `<p style="margin:24px 0 0"><a href="${urlSistema}" style="background:#004E36;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:14px">Abrir o sistema</a></p>`
      : ""
  }
  <p style="margin:24px 0 0;font-size:11px;color:#9CA3AF;border-top:1px solid #E5E5E5;padding-top:12px">
    ${escapar(EMPRESA.razaoSocial)} — ${escapar(EMPRESA.site)}
  </p>
</div>`.trim();

  return { assunto, html, texto };
}
