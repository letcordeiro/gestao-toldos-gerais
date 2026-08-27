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
  | "dias_apos_assinatura"
  | "data_fixa";

export type TipoPagamento = "sinal" | "parcela" | "saldo";

export type LinhaPagamento = {
  ordem: number;
  rotulo: string;
  tipo: TipoPagamento;
  valor: number; // centavos
  /** Modo opções: percentual do valor da opção contratada (soma tem que dar 100). */
  percentual: number | null;
  meio: MeioPagamento;
  numeroParcelas: number;
  gatilho: GatilhoPagamento;
  diasApos: number | null;
  dataVencimento: string | null; // "yyyy-MM-dd"
};

/** Uma alternativa de preço do mesmo contrato. */
export type OpcaoPreco = {
  ordem: number;
  rotulo: string;
  valor: number; // centavos
};

/** "Opção A", "Opção B"… pela ordem. */
export function letraOpcao(ordem: number): string {
  return String.fromCharCode(65 + ordem);
}

/** Duas ou mais opções colocam o contrato em modo opções. */
export function temOpcoes(opcoes: readonly OpcaoPreco[]): boolean {
  return opcoes.length > 0;
}

export type ValidacaoPercentual = {
  ok: boolean;
  soma: number;
  mensagem: string | null;
};

/**
 * Modo opções: as linhas são percentuais e precisam somar 100.
 * Arredonda em 2 casas antes de comparar — 33,33 + 33,33 + 33,34 fecha.
 */
export function validarPlanoPercentual(
  linhas: readonly { percentual?: number | null }[]
): ValidacaoPercentual {
  const soma =
    Math.round(linhas.reduce((s, l) => s + (l.percentual ?? 0), 0) * 100) / 100;
  if (linhas.length === 0) {
    return { ok: false, soma: 0, mensagem: "O plano de pagamento está vazio." };
  }
  if (soma === 100) return { ok: true, soma, mensagem: null };
  return {
    ok: false,
    soma,
    mensagem:
      soma > 100
        ? `Os percentuais somam ${soma}% — passam de 100%.`
        : `Os percentuais somam ${soma}% — faltam ${
            Math.round((100 - soma) * 100) / 100
          }%.`,
  };
}

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
  dias_apos_assinatura: "dias após a assinatura",
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
  | "intervalo_dias"
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
      chave: "intervalo_dias",
      nome: "N parcelas a cada X dias",
      descricao: "Datas fixas a partir de um dia escolhido",
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
  /** Dias entre parcelas no preset de intervalo. Padrão 30. */
  intervaloDias?: number;
  /** Meio de pagamento das parcelas geradas. Padrão pix. */
  meio?: MeioPagamento;
};

/** Soma dias a uma data ISO ("yyyy-MM-dd"), sem depender de fuso. */
function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1, d + dias));
  return data.toISOString().slice(0, 10);
}

/** Gera as linhas de um preset. `personalizado` devolve lista vazia. */
/**
 * Presets sempre nascem com valor fechado; o modo opções converte depois
 * (gerarPresetPercentual). Por isso o miolo devolve linhas sem `percentual`.
 */
export function gerarPreset(
  preset: PresetPlano,
  valorTotal: number,
  opcoes: OpcoesPreset = {}
): LinhaPagamento[] {
  return gerarPresetValores(preset, valorTotal, opcoes).map((l) => ({
    ...l,
    percentual: null,
  }));
}

/** Mesmo preset, mas em percentual — para contrato com opções de preço. */
export function gerarPresetPercentual(
  preset: PresetPlano,
  opcoes: OpcoesPreset = {}
): LinhaPagamento[] {
  // Base fictícia só para reaproveitar a divisão do preset; o que sai daqui é
  // percentual, não dinheiro.
  const BASE = 1_000_000;
  const linhas = gerarPresetValores(preset, BASE, opcoes);
  // Centésimos de ponto percentual, em inteiro. Arredondar cada linha por
  // conta própria estoura 100% (3 × 16,67 = 50,01); o resto vai para a última.
  const centesimos = linhas.map((l) => Math.floor((l.valor * 10000) / BASE));
  const sobra = 10000 - centesimos.reduce((a, b) => a + b, 0);
  if (centesimos.length > 0) centesimos[centesimos.length - 1] += sobra;
  return linhas.map((l, i) => ({
    ...l,
    valor: 0,
    percentual: centesimos[i] / 100,
  }));
}

function gerarPresetValores(
  preset: PresetPlano,
  valorTotal: number,
  opcoes: OpcoesPreset = {}
): Omit<LinhaPagamento, "percentual">[] {
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
      const linhas: Omit<LinhaPagamento, "percentual">[] = [
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

    // "6× a cada 30 dias a partir de 10/09": o gerador cru, sem entrada e sem
    // amarrar a periodicidade ao mês. Complementa os presets acima.
    case "intervalo_dias": {
      const n = Math.max(1, opcoes.parcelas ?? 3);
      const intervalo = Math.max(1, opcoes.intervaloDias ?? 30);
      const meio = opcoes.meio ?? "pix";
      const valores = dividirCentavos(valorTotal, n);
      // A primeira parcela vence na data base; as seguintes a cada intervalo.
      return valores.map((valor, i) => ({
        ordem: i,
        rotulo: n === 1 ? "Pagamento" : `Parcela ${i + 1} de ${n}`,
        tipo: (i === 0 && n > 1 ? "sinal" : "parcela") as TipoPagamento,
        valor,
        meio,
        numeroParcelas: 1,
        gatilho: "data_fixa" as GatilhoPagamento,
        diasApos: null,
        dataVencimento: somarDias(dataBase, i * intervalo),
      }));
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
  pagamentos: readonly {
    valor: number;
    percentual?: number | null;
  }[];
  opcoes?: readonly OpcaoPreco[];
};

/** Lista o que falta para emitir. Vazio = pode emitir. */
export function pendenciasParaEmitir(dados: DadosPendencia): string[] {
  const faltas: string[] = [];
  const opcoes = dados.opcoes ?? [];
  const modoOpcoes = temOpcoes(opcoes);

  if (!dados.clienteNome.trim()) faltas.push("Nome do cliente");
  if (!dados.clienteDocumento?.trim()) {
    faltas.push(
      "CPF/CNPJ do cliente — sem documento o contrato não serve para cobrança"
    );
  }
  if (!dados.clienteEndereco?.trim()) faltas.push("Endereço do cliente");
  if (!dados.localInstalacao.trim()) faltas.push("Local da instalação");
  if (dados.itens.length === 0) faltas.push("Ao menos um item no contrato");

  if (modoOpcoes) {
    // Uma opção só não é opção: ou vira valor fechado, ou ganha companhia.
    if (opcoes.length < 2) {
      faltas.push(
        "Opções de preço: com uma opção só, use o valor total fechado"
      );
    }
    opcoes.forEach((o, i) => {
      if (!o.rotulo.trim()) {
        faltas.push(`Opção ${letraOpcao(i)}: falta a descrição`);
      }
      if (o.valor <= 0) faltas.push(`Opção ${letraOpcao(i)}: falta o valor`);
    });
    const plano = validarPlanoPercentual(dados.pagamentos);
    if (!plano.ok) faltas.push(`Plano de pagamento: ${plano.mensagem}`);
    return faltas;
  }

  if (dados.valorTotal <= 0) faltas.push("Valor total do contrato");
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

/**
 * Lê o snapshot gravado na emissão. Snapshot corrompido ou de formato antigo
 * vira `null` (= sem comparação) em vez de derrubar a tela do contrato.
 */
export function lerSnapshot(bruto: string | null): SnapshotContrato | null {
  if (!bruto) return null;
  try {
    const s = JSON.parse(bruto) as Partial<SnapshotContrato>;
    if (!s?.cliente || !s?.orcamento) return null;
    if (typeof s.orcamento.valorTotal !== "number") return null;
    return s as SnapshotContrato;
  } catch {
    return null;
  }
}

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
