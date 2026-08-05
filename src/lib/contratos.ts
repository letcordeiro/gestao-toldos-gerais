// Regras puras do módulo de contratos — sem acesso a banco, para poder testar
// isoladamente. As funções que tocam o banco ficam nas server actions.

export type StatusContrato =
  | "rascunho"
  | "emitido"
  | "assinado"
  | "aditivado"
  | "cancelado";

export type EscopoContrato =
  | "fabricacao"
  | "remocao_fabricacao"
  | "manutencao"
  | "troca_lona";

export type MeioPagamento =
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "transferencia"
  | "boleto"
  | "dinheiro";

export type GatilhoPagamento =
  | "assinatura"
  | "inicio_fabricacao"
  | "entrega_material"
  | "conclusao_instalacao"
  | "dias_apos_instalacao"
  | "data_fixa";

export type TipoPagamento = "sinal" | "parcela" | "saldo";

export type LinhaPagamento = {
  ordem: number;
  rotulo: string;
  tipo: TipoPagamento;
  valor: number; // centavos
  meio: MeioPagamento;
  numeroParcelas: number;
  gatilho: GatilhoPagamento;
  diasApos: number | null;
  dataVencimento: string | null; // "yyyy-MM-dd"
};

export const ESCOPO_LABEL: Record<EscopoContrato, string> = {
  fabricacao: "Fabricação e instalação",
  remocao_fabricacao: "Remoção, fabricação e instalação",
  manutencao: "Manutenção",
  troca_lona: "Troca de lona",
};

export const STATUS_LABEL: Record<StatusContrato, string> = {
  rascunho: "Rascunho",
  emitido: "Emitido",
  assinado: "Assinado",
  aditivado: "Aditivado",
  cancelado: "Cancelado",
};

export const MEIO_LABEL: Record<MeioPagamento, string> = {
  pix: "PIX",
  cartao_credito: "cartão de crédito",
  cartao_debito: "cartão de débito",
  transferencia: "transferência bancária",
  boleto: "boleto bancário",
  dinheiro: "dinheiro",
};

export const TIPO_LABEL: Record<TipoPagamento, string> = {
  sinal: "Sinal/entrada",
  parcela: "Parcelas",
  saldo: "Saldo",
};

export const GATILHO_LABEL: Record<GatilhoPagamento, string> = {
  assinatura: "na assinatura",
  inicio_fabricacao: "no início da fabricação",
  entrega_material: "na entrega do material",
  conclusao_instalacao: "na conclusão da instalação",
  dias_apos_instalacao: "dias após a instalação",
  data_fixa: "em data fixa",
};

// ---------------------------------------------------------------------------
// Numeração
// ---------------------------------------------------------------------------

/**
 * Próximo número de contrato do ano, no formato CT-AAAA-NNNN.
 * Recebe os números já existentes (qualquer ano) e ignora o que não casar.
 */
export function proximoNumeroContrato(
  numerosExistentes: readonly (string | null)[],
  ano: number
): string {
  const prefixo = `CT-${ano}-`;
  const maior = numerosExistentes.reduce((max, numero) => {
    if (!numero || !numero.startsWith(prefixo)) return max;
    const seq = parseInt(numero.slice(prefixo.length), 10);
    return Number.isFinite(seq) ? Math.max(max, seq) : max;
  }, 0);
  return `${prefixo}${String(maior + 1).padStart(4, "0")}`;
}

/** Próximo número de aditivo dentro de um contrato (sequencial simples). */
export function proximoNumeroAditivo(
  numerosExistentes: readonly number[]
): number {
  return numerosExistentes.reduce((max, n) => Math.max(max, n), 0) + 1;
}

// ---------------------------------------------------------------------------
// Validação do plano de pagamento
// ---------------------------------------------------------------------------

export type ValidacaoPlano = {
  ok: boolean;
  soma: number;
  diferenca: number; // soma - total (positivo = passou, negativo = falta)
  mensagem: string | null;
};

/** A soma das linhas precisa bater exatamente com o valor total do contrato. */
export function validarPlanoPagamento(
  linhas: readonly Pick<LinhaPagamento, "valor">[],
  valorTotal: number
): ValidacaoPlano {
  const soma = linhas.reduce((s, l) => s + l.valor, 0);
  const diferenca = soma - valorTotal;
  if (linhas.length === 0) {
    return {
      ok: false,
      soma: 0,
      diferenca: -valorTotal,
      mensagem: "O plano de pagamento está vazio.",
    };
  }
  if (diferenca === 0) {
    return { ok: true, soma, diferenca: 0, mensagem: null };
  }
  return {
    ok: false,
    soma,
    diferenca,
    mensagem:
      diferenca > 0
        ? "A soma das linhas passa do valor total."
        : "A soma das linhas não alcança o valor total.",
  };
}

// ---------------------------------------------------------------------------
// Presets de plano de pagamento
// ---------------------------------------------------------------------------

export type PresetPlano =
  | "a_vista"
  | "entrada_saldo_entrega"
  | "entrada_saldo_cartao"
  | "parcelado_cartao"
  | "entrada_parcelas_mensais"
  | "personalizado";

export const PRESETS: { chave: PresetPlano; nome: string; descricao: string }[] =
  [
    { chave: "a_vista", nome: "À vista", descricao: "Tudo na assinatura" },
    {
      chave: "entrada_saldo_entrega",
      nome: "Entrada + saldo na entrega",
      descricao: "50% assinatura, 50% na conclusão",
    },
    {
      chave: "entrada_saldo_cartao",
      nome: "Entrada + saldo no cartão",
      descricao: "50% assinatura, saldo parcelado",
    },
    {
      chave: "parcelado_cartao",
      nome: "Parcelado no cartão",
      descricao: "Total em N vezes",
    },
    {
      chave: "entrada_parcelas_mensais",
      nome: "Entrada + parcelas mensais",
      descricao: "Entrada + N mensais (PIX/boleto)",
    },
    {
      chave: "personalizado",
      nome: "Personalizado",
      descricao: "Monte as linhas do zero",
    },
  ];

/**
 * Divide um valor em N partes cujas somas fecham exatamente com o total.
 * O resto de centavos vai para a primeira parcela (padrão de mercado).
 */
export function dividirCentavos(total: number, partes: number): number[] {
  if (partes <= 0) return [];
  const base = Math.floor(total / partes);
  const resto = total - base * partes;
  return Array.from({ length: partes }, (_, i) => (i === 0 ? base + resto : base));
}

/** Soma meses a uma data ISO ("yyyy-MM-dd"), sem depender de fuso. */
function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1 + meses, 1));
  // Fixa no último dia do mês quando o dia original não existe (31 → 30).
  const ultimoDia = new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)
  ).getUTCDate();
  data.setUTCDate(Math.min(d, ultimoDia));
  return data.toISOString().slice(0, 10);
}

export type OpcoesPreset = {
  /** Percentual de entrada (0 a 100) nos presets com entrada. Padrão 50. */
  entradaPercent?: number;
  /** Número de parcelas nos presets parcelados. Padrão 6 (cartão) / 3 (mensais). */
  parcelas?: number;
  /** Data base para vencimentos mensais ("yyyy-MM-dd"). Padrão: hoje. */
  dataBase?: string;
};

/** Gera as linhas de um preset. `personalizado` devolve lista vazia. */
export function gerarPreset(
  preset: PresetPlano,
  valorTotal: number,
  opcoes: OpcoesPreset = {}
): LinhaPagamento[] {
  const entradaPercent = opcoes.entradaPercent ?? 50;
  const dataBase = opcoes.dataBase ?? new Date().toISOString().slice(0, 10);
  const entrada = Math.round((valorTotal * entradaPercent) / 100);
  const saldo = valorTotal - entrada;

  switch (preset) {
    case "a_vista":
      return [
        {
          ordem: 0,
          rotulo: "Pagamento à vista",
          tipo: "saldo",
          valor: valorTotal,
          meio: "pix",
          numeroParcelas: 1,
          gatilho: "assinatura",
          diasApos: null,
          dataVencimento: null,
        },
      ];

    case "entrada_saldo_entrega":
      return [
        {
          ordem: 0,
          rotulo: "Sinal/entrada",
          tipo: "sinal",
          valor: entrada,
          meio: "pix",
          numeroParcelas: 1,
          gatilho: "assinatura",
          diasApos: null,
          dataVencimento: null,
        },
        {
          ordem: 1,
          rotulo: "Saldo",
          tipo: "saldo",
          valor: saldo,
          meio: "pix",
          numeroParcelas: 1,
          gatilho: "conclusao_instalacao",
          diasApos: null,
          dataVencimento: null,
        },
      ];

    case "entrada_saldo_cartao":
      return [
        {
          ordem: 0,
          rotulo: "Sinal/entrada",
          tipo: "sinal",
          valor: entrada,
          meio: "pix",
          numeroParcelas: 1,
          gatilho: "assinatura",
          diasApos: null,
          dataVencimento: null,
        },
        {
          ordem: 1,
          rotulo: "Saldo",
          tipo: "saldo",
          valor: saldo,
          meio: "cartao_credito",
          numeroParcelas: opcoes.parcelas ?? 6,
          gatilho: "conclusao_instalacao",
          diasApos: null,
          dataVencimento: null,
        },
      ];

    case "parcelado_cartao":
      return [
        {
          ordem: 0,
          rotulo: "Pagamento parcelado",
          tipo: "parcela",
          valor: valorTotal,
          meio: "cartao_credito",
          numeroParcelas: opcoes.parcelas ?? 6,
          gatilho: "assinatura",
          diasApos: null,
          dataVencimento: null,
        },
      ];

    case "entrada_parcelas_mensais": {
      const n = opcoes.parcelas ?? 3;
      const valores = dividirCentavos(saldo, n);
      const linhas: LinhaPagamento[] = [
        {
          ordem: 0,
          rotulo: "Sinal/entrada",
          tipo: "sinal",
          valor: entrada,
          meio: "pix",
          numeroParcelas: 1,
          gatilho: "assinatura",
          diasApos: null,
          dataVencimento: null,
        },
      ];
      valores.forEach((valor, i) => {
        linhas.push({
          ordem: i + 1,
          rotulo: `Parcela ${i + 1} de ${n}`,
          tipo: "parcela",
          valor,
          meio: "pix",
          numeroParcelas: 1,
          gatilho: "data_fixa",
          diasApos: null,
          dataVencimento: somarMeses(dataBase, i + 1),
        });
      });
      return linhas;
    }

    case "personalizado":
      return [];
  }
}

// ---------------------------------------------------------------------------
// Pendências antes de emitir
// ---------------------------------------------------------------------------

export type DadosPendencia = {
  clienteNome: string;
  clienteDocumento: string | null;
  clienteEndereco: string | null;
  localInstalacao: string;
  valorTotal: number;
  itens: readonly unknown[];
  pagamentos: readonly Pick<LinhaPagamento, "valor">[];
};

/** Lista o que falta para emitir. Vazio = pode emitir. */
export function pendenciasParaEmitir(dados: DadosPendencia): string[] {
  const faltas: string[] = [];
  if (!dados.clienteNome.trim()) faltas.push("Nome do cliente");
  if (!dados.clienteDocumento?.trim()) {
    faltas.push(
      "CPF/CNPJ do cliente — sem documento o contrato não serve para cobrança"
    );
  }
  if (!dados.clienteEndereco?.trim()) faltas.push("Endereço do cliente");
  if (!dados.localInstalacao.trim()) faltas.push("Local da instalação");
  if (dados.valorTotal <= 0) faltas.push("Valor total do contrato");
  if (dados.itens.length === 0) faltas.push("Ao menos um item no contrato");
  const plano = validarPlanoPagamento(dados.pagamentos, dados.valorTotal);
  if (!plano.ok) {
    faltas.push(`Plano de pagamento: ${plano.mensagem}`);
  }
  return faltas;
}

// ---------------------------------------------------------------------------
// Divergência com o orçamento de origem
// ---------------------------------------------------------------------------

export type SnapshotContrato = {
  cliente: {
    nome: string;
    documento: string | null;
    endereco: string | null;
    telefone: string;
    email: string | null;
  };
  orcamento: {
    numero: string;
    status: string;
    valorTotal: number;
  };
};

export type Divergencia = { campo: string; noContrato: string; hoje: string };

/**
 * Compara o snapshot congelado com o estado atual do orçamento/cliente.
 * Nunca sincroniza — só aponta o que mudou, para o usuário decidir.
 */
export function compararComOrigem(
  snapshot: SnapshotContrato | null,
  atual: SnapshotContrato
): Divergencia[] {
  if (!snapshot) return [];
  const divs: Divergencia[] = [];
  const cmp = (campo: string, a: string | null, b: string | null) => {
    const va = (a ?? "").trim();
    const vb = (b ?? "").trim();
    if (va !== vb) divs.push({ campo, noContrato: va || "—", hoje: vb || "—" });
  };
  cmp("Nome do cliente", snapshot.cliente.nome, atual.cliente.nome);
  cmp("CPF/CNPJ", snapshot.cliente.documento, atual.cliente.documento);
  cmp("Endereço", snapshot.cliente.endereco, atual.cliente.endereco);
  cmp("Telefone", snapshot.cliente.telefone, atual.cliente.telefone);
  if (snapshot.orcamento.valorTotal !== atual.orcamento.valorTotal) {
    divs.push({
      campo: "Valor do orçamento",
      noContrato: String(snapshot.orcamento.valorTotal),
      hoje: String(atual.orcamento.valorTotal),
    });
  }
  cmp("Status do orçamento", snapshot.orcamento.status, atual.orcamento.status);
  return divs;
}

// ---------------------------------------------------------------------------
// Transições de status permitidas
// ---------------------------------------------------------------------------

export type AcaoContrato =
  | "editar"
  | "emitir"
  | "assinar"
  | "versionar"
  | "aditivar"
  | "cancelar";

/**
 * Fonte única do que pode ser feito em cada status. Depois de ASSINADO,
 * edição e versionamento saem de cena — a única saída é o aditivo.
 */
export function acoesPermitidas(status: StatusContrato): AcaoContrato[] {
  switch (status) {
    case "rascunho":
      return ["editar", "emitir", "cancelar"];
    case "emitido":
      return ["assinar", "versionar", "cancelar"];
    case "assinado":
      return ["aditivar", "cancelar"];
    case "aditivado":
      return ["aditivar", "cancelar"];
    case "cancelado":
      return [];
  }
}

export function podeFazer(status: StatusContrato, acao: AcaoContrato): boolean {
  return acoesPermitidas(status).includes(acao);
}

/** Valor retido no cancelamento: retencaoPercent sobre o total. */
export function calcularRetencao(
  valorTotal: number,
  retencaoPercent: number
): number {
  return Math.round((valorTotal * retencaoPercent) / 100);
}
