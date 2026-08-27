// Definição dos blocos do resumo e a regra de "já está na hora de mandar?".
// Módulo puro (sem banco) — o conteúdo de cada bloco é montado em
// `resumo-conteudo.ts`.

export type Frequencia = "diario" | "semanal" | "quinzenal" | "mensal";

export const FREQUENCIA_LABEL: Record<Frequencia, string> = {
  diario: "Todo dia",
  semanal: "Toda segunda-feira",
  quinzenal: "A cada 15 dias",
  mensal: "Todo dia 1º",
};

export const FREQUENCIA_DIAS: Record<Frequencia, number> = {
  diario: 1,
  semanal: 7,
  quinzenal: 15,
  mensal: 30,
};

export type Bloco =
  | "tarefas_do_dia"
  | "orcamentos_sem_resposta"
  | "instalacoes"
  | "parcelas_vencidas"
  | "contratos_sem_assinatura"
  | "atendimentos_parados"
  | "resumo_funil";

export const BLOCOS: { chave: Bloco; nome: string; ajuda: string }[] = [
  {
    chave: "tarefas_do_dia",
    nome: "Tarefas atrasadas e de hoje",
    ajuda: "O que está combinado e vence agora",
  },
  {
    chave: "orcamentos_sem_resposta",
    nome: "Orçamentos sem resposta",
    ajuda: "Propostas enviadas que o cliente não respondeu",
  },
  {
    chave: "instalacoes",
    nome: "Instalações vencidas e da semana",
    ajuda: "O que está para instalar",
  },
  {
    chave: "parcelas_vencidas",
    nome: "Parcelas vencidas",
    ajuda: "Dinheiro a receber em atraso",
  },
  {
    chave: "contratos_sem_assinatura",
    nome: "Contratos sem assinatura",
    ajuda: "Emitidos e ainda não assinados",
  },
  {
    chave: "atendimentos_parados",
    nome: "Atendimentos parados",
    ajuda: "Sem tarefa e sem movimento há 30 dias",
  },
  {
    chave: "resumo_funil",
    nome: "Números do funil",
    ajuda: "Conversão, ticket médio e ciclo de venda",
  },
];

export type TipoDestinatario = "para" | "copia" | "oculta";

export type Destinatario = { email: string; tipo: TipoDestinatario };

export const MAX_DESTINATARIOS = 5;

/**
 * Já está na hora de mandar?
 *
 * Compara com o ÚLTIMO ENVIO, não com o calendário: se o cron falhou ontem, o
 * resumo sai na próxima chamada em vez de pular o dia em silêncio.
 */
export function estaNaHora(
  frequencia: Frequencia,
  ultimoEnvioEm: Date | null,
  agora = new Date()
): boolean {
  if (!ultimoEnvioEm) return true;
  const MS_DIA = 24 * 60 * 60 * 1000;
  const dias = (agora.getTime() - ultimoEnvioEm.getTime()) / MS_DIA;
  // Margem de 2 horas: um cron que roda 23h58 depois não pode ser recusado
  // por 2 minutos de diferença.
  return dias >= FREQUENCIA_DIAS[frequencia] - 2 / 24;
}

/** Lê a lista de blocos gravada em JSON, ignorando o que não reconhece. */
export function lerBlocos(json: string): Bloco[] {
  try {
    const bruto: unknown = JSON.parse(json);
    if (!Array.isArray(bruto)) return [];
    const validos = new Set(BLOCOS.map((b) => b.chave));
    return bruto.filter(
      (x): x is Bloco => typeof x === "string" && validos.has(x as Bloco)
    );
  } catch {
    return [];
  }
}

/** Lê os destinatários gravados em JSON, descartando entrada inválida. */
export function lerDestinatarios(json: string): Destinatario[] {
  try {
    const bruto: unknown = JSON.parse(json);
    if (!Array.isArray(bruto)) return [];
    return bruto
      .filter(
        (x): x is Destinatario =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as Destinatario).email === "string" &&
          ["para", "copia", "oculta"].includes((x as Destinatario).tipo)
      )
      .slice(0, MAX_DESTINATARIOS);
  } catch {
    return [];
  }
}

/** Separa os destinatários nos três campos do e-mail. */
export function separarDestinatarios(lista: Destinatario[]): {
  para: string[];
  copia: string[];
  oculta: string[];
} {
  return {
    para: lista.filter((d) => d.tipo === "para").map((d) => d.email),
    copia: lista.filter((d) => d.tipo === "copia").map((d) => d.email),
    oculta: lista.filter((d) => d.tipo === "oculta").map((d) => d.email),
  };
}
