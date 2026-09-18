// FONTE ÚNICA do texto do contrato.
// A prévia em HTML e o PDF renderizam a MESMA estrutura devolvida por
// `montarClausulas` — nenhuma frase é escrita duas vezes.

import { valorPorExtenso } from "./valor-extenso";
import {
  ESCOPO_LABEL,
  letraOpcao,
  MEIO_LABEL,
  type EscopoContrato,
  type GatilhoPagamento,
  type LinhaPagamento,
} from "./contratos";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function moeda(centavos: number): string {
  // Intl pt-BR separa "R$" do número com espaço não separável (U+00A0), que o
  // react-pdf renderiza com fonte de fallback. No corpo do contrato usamos
  // espaço comum.
  return brl.format(centavos / 100).replace(/\u00A0/g, " ");
}

/** "R$ 1.995,00 (mil novecentos e noventa e cinco reais)" */
export function moedaComExtenso(centavos: number): string {
  return `${moeda(centavos)} (${valorPorExtenso(centavos)})`;
}

const ORDINAIS = [
  "PRIMEIRA",
  "SEGUNDA",
  "TERCEIRA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SÉTIMA",
  "OITAVA",
  "NONA",
  "DÉCIMA",
  "DÉCIMA PRIMEIRA",
  "DÉCIMA SEGUNDA",
  "DÉCIMA TERCEIRA",
  "DÉCIMA QUARTA",
  "DÉCIMA QUINTA",
];

/** "CLÁUSULA PRIMEIRA" a partir do índice 0. */
export function ordinalClausula(indice: number): string {
  return ORDINAIS[indice] ?? `${indice + 1}ª`;
}

export type DadosContrato = {
  numero: string | null;
  versao: number;
  status: string;
  escopo: EscopoContrato;
  localInstalacao: string;
  observacoesTecnicas: string | null;
  valorTotal: number;
  prazoDiasUteis: number;
  garantiaMeses: number;
  retencaoPercent: number;
  multaPercent: number;
  jurosMesPercent: number;
  /** Multa por dia de atraso DA CONTRATADA, e o teto dela. */
  multaContratadaDiaPercent: number;
  multaContratadaTetoPercent: number;
  /** Diária cobrada quando o cliente manda parar a obra (centavos). */
  paralisacaoDiaria: number;
  flagMedidas: boolean;
  flagClima: boolean;
  flagEnergia: boolean;
  flagSobMedida: boolean;
  representante: string;
  cidadeEmissao: string;
  dataEmissaoExtenso: string | null;
  contratante: {
    nome: string;
    documento: string | null;
    endereco: string | null;
    telefone: string;
    email: string | null;
    /** Quem assina pela empresa contratante (só usado quando é CNPJ). */
    representante?: string | null;
  };
  itens: Array<{
    modelo: string;
    cor: string | null;
    medidasM2: string | null;
    descricaoExtra: string | null;
  }>;
  pagamentos: LinhaPagamento[];
  /** Duas ou mais = contrato com opções de preço (pagamento em percentual). */
  opcoes?: Array<{ rotulo: string; valor: number }>;
  aditivos?: Array<{
    numero: number;
    objeto: string;
    deltaValor: number;
    novoPrazoDiasUteis: number | null;
    dataAssinaturaExtenso: string | null;
  }>;
};

/** Frase do gatilho dentro da cláusula de pagamento. */
function frasePorGatilho(
  gatilho: GatilhoPagamento,
  diasApos: number | null,
  dataVencimento: string | null
): string {
  switch (gatilho) {
    case "assinatura":
      return "no ato da assinatura deste instrumento";
    case "inicio_fabricacao":
      return "no início da fabricação";
    case "entrega_material":
      return "na entrega do material";
    case "conclusao_instalacao":
      return "na conclusão da instalação";
    case "dias_apos_instalacao":
      return `em até ${diasApos ?? 0} (${
        diasApos != null ? valorPorExtensoSimples(diasApos) : "zero"
      }) dias após a conclusão da instalação`;
    case "dias_apos_assinatura":
      return `em até ${diasApos ?? 0} (${
        diasApos != null ? valorPorExtensoSimples(diasApos) : "zero"
      }) dias da assinatura deste instrumento`;
    case "data_fixa":
      return dataVencimento
        ? `com vencimento em ${formatarDataBR(dataVencimento)}`
        : "em data a ser ajustada entre as partes";
  }
}

// Números pequenos por extenso (dias, parcelas) — sem a moeda.
function valorPorExtensoSimples(n: number): string {
  // reaproveita o helper monetário: n reais → texto sem " reais"
  return valorPorExtenso(n * 100).replace(/ reais?$/, "");
}

function formatarDataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/**
 * Vencimentos escalonados: 3 parcelas a cada 30 dias viram "30, 60 e 90 dias".
 * É como a cobrança em boleto é escrita na prática — dizer só "em até 30 dias"
 * para três parcelas estaria errado.
 */
function listaDeVencimentos(parcelas: number, intervalo: number): string {
  const dias = Array.from({ length: parcelas }, (_, i) => intervalo * (i + 1));
  const ultimo = dias.pop();
  return `${dias.join(", ")} e ${ultimo}`;
}

/** "50% (cinquenta por cento)"; percentual quebrado sai só em número. */
function percentualPorExtenso(p: number): string {
  const texto = Number.isInteger(p)
    ? `${p}% (${valorPorExtensoSimples(p)} por cento)`
    : `${String(p).replace(".", ",")}%`;
  return texto;
}

/** Uma linha do plano de pagamento vira uma frase legível do contrato. */
export function frasePagamento(linha: LinhaPagamento): string {
  // Modo opções: o valor só existe depois que o cliente escolhe, então a
  // linha fala em percentual do valor da opção contratada.
  const abertura =
    linha.percentual != null
      ? `${linha.rotulo}: ${percentualPorExtenso(
          linha.percentual
        )} do valor da opção contratada`
      : `${linha.rotulo}: ${moedaComExtenso(linha.valor)}`;
  const partes = [abertura];
  const escalonado =
    linha.numeroParcelas > 1 &&
    linha.diasApos != null &&
    linha.diasApos > 0 &&
    (linha.gatilho === "dias_apos_assinatura" ||
      linha.gatilho === "dias_apos_instalacao");

  if (linha.numeroParcelas > 1) {
    partes.push(`em ${linha.numeroParcelas}x no ${MEIO_LABEL[linha.meio]}`);
  } else {
    partes.push(`por meio de ${MEIO_LABEL[linha.meio]}`);
  }

  if (escalonado) {
    const referencia =
      linha.gatilho === "dias_apos_assinatura"
        ? "da assinatura deste instrumento"
        : "da conclusão da instalação";
    partes.push(
      `com vencimentos em ${listaDeVencimentos(
        linha.numeroParcelas,
        linha.diasApos!
      )} dias contados ${referencia}`
    );
  } else {
    partes.push(
      frasePorGatilho(linha.gatilho, linha.diasApos, linha.dataVencimento)
    );
  }
  return `${partes.join(", ")}.`;
}

export type Clausula = {
  titulo: string;
  paragrafos: string[];
  /** Itens em lista (a, b, c) dentro da cláusula. */
  itens?: string[];
  /** Parágrafos que vêm DEPOIS da lista de itens. */
  paragrafosFinais?: string[];
  /** Segunda lista, no fim — usada pelo plano de pagamento quando a cláusula
   *  já gastou a primeira lista com as opções de preço. */
  itensFinais?: string[];
  /** Parágrafo único destacado ao final. */
  paragrafoUnico?: string;
};

/**
 * Monta as cláusulas na ordem, já numeradas. As opcionais desligadas somem e as
 * demais são renumeradas automaticamente (a numeração vem do índice do array).
 */
export function montarClausulas(dados: DadosContrato): Clausula[] {
  const clausulas: Clausula[] = [];

  // 1 — DO OBJETO
  const listaItens = dados.itens.map((item) => {
    const detalhes = [
      item.cor ? `cor ${item.cor}` : null,
      item.medidasM2 ? `medidas ${item.medidasM2}` : null,
      item.descricaoExtra,
    ]
      .filter(Boolean)
      .join(" — ");
    return detalhes ? `${item.modelo} (${detalhes})` : item.modelo;
  });
  const objeto: Clausula = {
    titulo: "DO OBJETO",
    paragrafos: [
      `O presente contrato tem por objeto ${ESCOPO_LABEL[
        dados.escopo
      ].toLowerCase()}, pela CONTRATADA, dos produtos abaixo discriminados, ` +
        `a serem instalados em ${dados.localInstalacao || "local a ser indicado pelo CONTRATANTE"}.`,
    ],
    itens: listaItens,
  };
  // Observações técnicas costumam ser um descritivo longo (perfis, calhas,
  // acabamento…). Cada linha vira um parágrafo próprio, senão o texto inteiro
  // sai espremido numa linha só.
  const linhas = (dados.observacoesTecnicas ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (linhas.length === 1) {
    objeto.paragrafos.push(`Observações técnicas: ${linhas[0]}`);
  } else if (linhas.length > 1) {
    objeto.paragrafos.push("Observações técnicas:", ...linhas);
  }
  if (dados.flagSobMedida) {
    objeto.paragrafoUnico =
      "Parágrafo único. Os produtos objeto deste contrato são fabricados sob medida, " +
      "conforme as especificações e as medidas conferidas no local, não se aplicando o " +
      "direito de arrependimento previsto para compras fora do estabelecimento comercial, " +
      "nos termos do art. 49 do Código de Defesa do Consumidor.";
  }
  clausulas.push(objeto);

  // 2 — DO VALOR E DA FORMA DE PAGAMENTO
  // O valor cobre MATERIAIS + MÃO DE OBRA (correção em relação ao modelo antigo).
  const opcoes = dados.opcoes ?? [];
  const modoOpcoes = opcoes.length > 0;

  const pagamento: Clausula = modoOpcoes
    ? {
        titulo: "DO VALOR E DA FORMA DE PAGAMENTO",
        paragrafos: [
          "O valor total do presente contrato, compreendendo o fornecimento dos " +
            "materiais e a mão de obra de instalação, corresponde à opção contratada " +
            "pelo CONTRATANTE dentre as seguintes:",
        ],
        // As opções entram como lista (a, b, c…), como os itens do objeto.
        itens: opcoes.map(
          (o, i) =>
            `Opção ${letraOpcao(i)} — ${o.rotulo}: ${moedaComExtenso(o.valor)}.`
        ),
      }
    : {
        titulo: "DO VALOR E DA FORMA DE PAGAMENTO",
        paragrafos: [
          `O valor total do presente contrato é de ${moedaComExtenso(
            dados.valorTotal
          )}, compreendendo o fornecimento dos materiais e a mão de obra de instalação.`,
          "O pagamento será realizado da seguinte forma:",
        ],
        itens: dados.pagamentos.map(frasePagamento),
      };

  if (modoOpcoes) {
    // Com opções, o plano vem depois da lista de preços — senão o leitor vê
    // percentuais antes de saber sobre o quê incidem.
    pagamento.paragrafosFinais = [
      "A opção contratada será indicada por escrito pelo CONTRATANTE no ato da " +
        "assinatura deste instrumento, passando o respectivo valor a ser o valor " +
        "total do contrato para todos os efeitos.",
      "O pagamento será realizado da seguinte forma:",
    ];
    pagamento.itensFinais = dados.pagamentos.map(frasePagamento);
  }

  // "Sinal" só é mencionado quando existe de fato e é menor que o total.
  const sinal = dados.pagamentos.find((p) => p.tipo === "sinal");
  if (modoOpcoes) {
    if (sinal && (sinal.percentual ?? 0) < 100) {
      pagamento.paragrafoUnico =
        "Parágrafo único. O valor pago a título de sinal confirma o negócio e " +
        "autoriza o início da fabricação, sendo abatido do valor total contratado.";
    }
  } else if (sinal && sinal.valor < dados.valorTotal) {
    pagamento.paragrafoUnico =
      `Parágrafo único. O valor pago a título de sinal, ${moedaComExtenso(
        sinal.valor
      )}, confirma o negócio e autoriza o início da fabricação, ` +
      "sendo abatido do valor total contratado.";
  }
  clausulas.push(pagamento);

  // 3 — DO PRAZO
  const prazo: Clausula = {
    titulo: "DO PRAZO DE ENTREGA E EXECUÇÃO",
    paragrafos: [
      `O prazo para fabricação e instalação é de ${dados.prazoDiasUteis} (${valorPorExtensoSimples(
        dados.prazoDiasUteis
      )}) dias úteis, contados da confirmação do pagamento inicial e da liberação do local pelo CONTRATANTE.`,
    ],
    itens: [],
  };
  if (dados.flagMedidas) {
    prazo.itens!.push(
      "O prazo somente tem início após a conferência final das medidas no local; " +
        "eventual alteração de medidas solicitada pelo CONTRATANTE reinicia a contagem."
    );
  }
  if (dados.flagClima) {
    prazo.itens!.push(
      "Ficam suspensos os prazos durante períodos de chuva, vento forte ou " +
        "outras condições climáticas que impeçam a instalação com segurança, " +
        "retomando-se a contagem no primeiro dia útil de condições favoráveis."
    );
  }
  if (prazo.itens!.length === 0) delete prazo.itens;
  // Paralisação pedida pelo cliente: a equipe sobe, o cliente manda voltar
  // outro dia, e o dia de trabalho se perde. Mora no PRAZO porque é aqui que
  // a prorrogação é tratada.
  prazo.paragrafosFinais = [
    `A paralisação dos trabalhos solicitada pelo CONTRATANTE, não prevista neste contrato, que implique ` +
      `perda do dia de trabalho da equipe, sujeita o CONTRATANTE ao pagamento de ` +
      `${moedaComExtenso(dados.paralisacaoDiaria)} por dia paralisado, a título de cobertura da mão de obra ` +
      `mobilizada, sem prejuízo da prorrogação do prazo de entrega pelo período correspondente.`,
  ];
  clausulas.push(prazo);

  // 4 — OBRIGAÇÕES DA CONTRATADA
  clausulas.push({
    titulo: "DAS OBRIGAÇÕES DA CONTRATADA",
    paragrafos: ["A CONTRATADA obriga-se a:"],
    itens: [
      "fornecer os materiais especificados na Cláusula Primeira, novos e de primeiro uso;",
      "executar a instalação por equipe própria ou credenciada, com observância das normas técnicas e de segurança aplicáveis;",
      "manter o CONTRATANTE informado sobre o andamento da fabricação e a data prevista de instalação;",
      "responsabilizar-se pelos encargos trabalhistas e previdenciários de sua equipe;",
      "reparar, dentro do prazo de garantia, os defeitos de fabricação ou de instalação que lhe forem imputáveis;",
      // Vindo do contrato da Telhado Técnico (18/09/2026). Na prática já é o
      // que a empresa faz; escrever evita a discussão de quem paga a pintura
      // da parede furada no lugar errado.
      "reparar os danos que sua equipe causar às instalações já existentes no local durante a execução dos serviços.",
    ],
  });

  // 5 — OBRIGAÇÕES DO CONTRATANTE
  const obrigacoesContratante: Clausula = {
    titulo: "DAS OBRIGAÇÕES DO CONTRATANTE",
    paragrafos: ["O CONTRATANTE obriga-se a:"],
    itens: [
      "efetuar os pagamentos nas condições e nos prazos ajustados na Cláusula Segunda;",
      "disponibilizar o local da instalação livre, desimpedido e em condições seguras de acesso na data agendada;",
      "informar previamente à CONTRATADA a existência de tubulações, fiações ou estruturas ocultas no local de fixação;",
      "obter, quando exigível, autorização do condomínio, do proprietário ou do poder público para a instalação;",
      // O imóvel raramente está vazio: é loja aberta, empresa funcionando ou
      // casa com gente dentro. Sem horário combinado, a equipe chega e não
      // sobe — e quem perde o dia é a CONTRATADA.
      "quando o imóvel estiver locado ou em funcionamento, combinar previamente com a CONTRATADA os horários de execução, " +
        "de modo que não haja circulação de pessoas sob a área de trabalho.",
    ],
  };
  if (dados.flagEnergia) {
    obrigacoesContratante.itens!.push(
      "disponibilizar ponto de energia elétrica adequado no local, sem ônus para a CONTRATADA, " +
        "inclusive para os produtos motorizados, quando for o caso."
    );
  }
  clausulas.push(obrigacoesContratante);

  // 6 — INADIMPLÊNCIA — os DOIS lados.
  // Antes só punia o cliente, o que o advogado do outro lado aponta como
  // desequilíbrio. A multa da CONTRATADA veio do contrato da Telhado Técnico
  // e foi decidida pela Letícia em 18/09/2026: por dia, com teto.
  clausulas.push({
    titulo: "DA INADIMPLÊNCIA E DO ATRASO",
    paragrafos: [
      `O atraso no pagamento de qualquer parcela sujeita o CONTRATANTE ao pagamento de multa de ` +
        `${formatarPercent(dados.multaPercent)}% sobre o valor em atraso, acrescida de juros de mora de ` +
        `${formatarPercent(dados.jurosMesPercent)}% ao mês, calculados pro rata die, sem prejuízo da correção monetária.`,
      "O atraso superior a 30 (trinta) dias autoriza a CONTRATADA a suspender a fabricação ou a instalação " +
        "até a regularização, ficando os prazos automaticamente prorrogados pelo período da suspensão.",
      `Na mesma medida, caso a CONTRATADA ultrapasse o prazo da Cláusula Terceira sem aviso prévio ao ` +
        `CONTRATANTE, incidirá multa de ${formatarPercent(dados.multaContratadaDiaPercent)}% por dia de atraso ` +
        `sobre o valor deste contrato, limitada a ${formatarPercent(dados.multaContratadaTetoPercent)}% do total. ` +
        `Não se considera atraso a prorrogação decorrente das hipóteses previstas na Cláusula Terceira, ` +
        `desde que comunicada ao CONTRATANTE.`,
    ],
  });

  // 7 — DESISTÊNCIA E RESCISÃO
  clausulas.push({
    titulo: "DA DESISTÊNCIA E DA RESCISÃO",
    paragrafos: [
      `Em caso de desistência do CONTRATANTE após o início da fabricação, será retido o percentual de ` +
        `${dados.retencaoPercent}% (${valorPorExtensoSimples(
          dados.retencaoPercent
        )} por cento) sobre o valor total do contrato, a título de cobertura dos custos de material ` +
        `sob medida já adquirido e da mão de obra empregada, devolvendo-se o saldo remanescente, se houver.`,
      "A rescisão por descumprimento de qualquer das cláusulas por qualquer das partes deverá ser " +
        "comunicada por escrito, assegurado o prazo de 10 (dez) dias para regularização.",
      "O contrato poderá ainda ser rescindido a qualquer tempo por comum acordo entre as partes, " +
        "formalizado por escrito, acertando-se os valores devidos até a data da rescisão.",
    ],
  });

  // 8 — GARANTIA
  clausulas.push({
    titulo: "DA GARANTIA",
    paragrafos: [
      `A CONTRATADA concede garantia de ${dados.garantiaMeses} (${valorPorExtensoSimples(
        dados.garantiaMeses
      )}) meses, contados da data da conclusão da instalação, contra defeitos de fabricação e de instalação.`,
      "A garantia não cobre danos decorrentes de mau uso, intervenção de terceiros não autorizados, " +
        "vendaval, granizo, queda de árvores ou outros eventos da natureza, nem o desgaste natural dos materiais.",
      // A defesa contra "o toldo manchou / a calha transbordou": sem
      // manutenção, a garantia não responde. Vem do contrato da Telhado
      // Técnico, que exige vistoria semestral das calhas.
      "A conservação é de responsabilidade do CONTRATANTE, que deverá realizar, no mínimo a cada 6 (seis) meses, " +
        "a limpeza da lona ou da cobertura e a desobstrução de calhas e condutores, quando houver. " +
        "A falta de manutenção adequada, comprovada por vistoria, exclui a cobertura da garantia quanto aos " +
        "danos dela decorrentes.",
    ],
  });

  // 9 — ALTERAÇÕES E SERVIÇOS EXTRAS
  clausulas.push({
    titulo: "DAS ALTERAÇÕES E DOS SERVIÇOS EXTRAS",
    paragrafos: [
      "Qualquer alteração de escopo, medidas, materiais, prazo ou valor após a assinatura deste " +
        "contrato somente terá validade mediante TERMO ADITIVO escrito, numerado e assinado por ambas as partes, " +
        "que passará a integrar este instrumento para todos os efeitos.",
      "Serviços não previstos na Cláusula Primeira serão orçados separadamente e dependem de aprovação " +
        "prévia do CONTRATANTE.",
    ],
  });

  // 10 — RESPONSABILIDADE TÉCNICA
  // A cláusula que faltava, e a mais valiosa das que vieram do contrato da
  // Telhado Técnico (18/09/2026): diz até onde vai a responsabilidade da
  // empresa. Toldo se fixa em parede, laje ou estrutura que JÁ ESTAVA LÁ — sem
  // este limite escrito, qualquer trinca ou infiltração antiga vira discussão
  // sobre quem paga.
  clausulas.push({
    titulo: "DA RESPONSABILIDADE TÉCNICA",
    paragrafos: [
      "A CONTRATADA declara possuir capacidade técnica para a execução dos serviços, respondendo:",
    ],
    itens: [
      "pela correta execução das intervenções realizadas e pela fixação adequada ao tipo de estrutura encontrada;",
      "pela observância das normas técnicas e de segurança aplicáveis;",
      "pelo zelo e pelo uso adequado dos materiais fornecidos.",
    ],
    paragrafosFinais: [
      "A responsabilidade técnica limita-se aos serviços executados no escopo deste contrato, não abrangendo " +
        "estruturas pré-existentes fora do escopo, problemas ocultos não identificáveis no momento da contratação, " +
        "nem alterações realizadas por terceiros após a instalação.",
      "Caso seja exigida Anotação de Responsabilidade Técnica (ART) ou documento equivalente, sua emissão " +
        "dependerá de contratação específica e de ajuste prévio de custos.",
    ],
  });

  // 11 — DISPOSIÇÕES GERAIS
  clausulas.push({
    titulo: "DAS DISPOSIÇÕES GERAIS",
    paragrafos: [
      "Este contrato não gera vínculo empregatício, societário ou de representação entre as partes, " +
        "nem entre o CONTRATANTE e os profissionais empregados pela CONTRATADA na execução dos serviços.",
      "A tolerância de qualquer das partes quanto ao descumprimento de qualquer cláusula não implica " +
        "novação, renúncia ou alteração do aqui pactuado.",
    ],
  });

  // 12 — FORO
  clausulas.push({
    titulo: "DO FORO",
    paragrafos: [
      "As partes elegem o foro da comarca de Belo Horizonte, Estado de Minas Gerais, para dirimir " +
        "quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia a qualquer outro, " +
        "por mais privilegiado que seja.",
    ],
  });

  return clausulas;
}

function formatarPercent(valor: number): string {
  return Number.isInteger(valor)
    ? String(valor)
    : String(valor).replace(".", ",");
}

/** Qualificação das partes — abre o contrato, antes das cláusulas. */
export function qualificacaoPartes(
  dados: DadosContrato,
  empresa: {
    razaoSocial: string;
    cnpj: string;
    endereco: string;
    /** Nome fantasia, quando a empresa opera com outro nome no mercado. */
    nomeFantasia?: string;
    /** Inscrição estadual — só entra na qualificação quando existe. */
    inscricaoEstadual?: string;
    /** Regime tributário (ex. optante pelo Simples Nacional), quando declarado. */
    regimeTributario?: string;
  }
): { contratada: string; contratante: string } {
  const fantasia = empresa.nomeFantasia
    ? `, nome fantasia ${empresa.nomeFantasia}`
    : "";
  const ie = empresa.inscricaoEstadual
    ? ` e na Inscrição Estadual sob o nº ${empresa.inscricaoEstadual}`
    : "";
  const regime = empresa.regimeTributario
    ? `, ${empresa.regimeTributario.charAt(0).toLowerCase()}${empresa.regimeTributario.slice(1)}`
    : "";
  return {
    contratada:
      `${empresa.razaoSocial}${fantasia}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ` +
      `${empresa.cnpj}${ie}, com sede em ${empresa.endereco}${regime}, neste ato representada por ` +
      `${dados.representante}, doravante denominada CONTRATADA;`,
    contratante: qualificacaoContratante(dados),
  };
}

/** CNPJ tem 14 dígitos; CPF, 11. Sem documento, trata como pessoa física. */
export function ehPessoaJuridica(documento: string | null | undefined): boolean {
  return (documento ?? "").replace(/\D/g, "").length === 14;
}

/**
 * Qualificação do CONTRATANTE. Empresa e pessoa física não se qualificam do
 * mesmo jeito: um hotel não é "residente e domiciliado", tem sede e assina por
 * um representante. O texto acompanha o tipo do documento.
 */
function qualificacaoContratante(dados: DadosContrato): string {
  const c = dados.contratante;
  const documento = c.documento ?? "____________________";
  const endereco = c.endereco ?? "____________________";
  const contatos =
    `${c.telefone ? `, telefone ${c.telefone}` : ""}` +
    `${c.email ? `, e-mail ${c.email}` : ""}`;

  if (ehPessoaJuridica(c.documento)) {
    const representante = c.representante?.trim() || "____________________";
    return (
      `${c.nome}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ` +
      `${documento}, com sede em ${endereco}${contatos}, neste ato representada por ` +
      `${representante}, doravante denominada CONTRATANTE.`
    );
  }

  return (
    `${c.nome}, inscrito(a) no CPF sob o nº ${documento}, residente e ` +
    `domiciliado(a) em ${endereco}${contatos}, doravante denominado(a) CONTRATANTE.`
  );
}

/** Cabeçalho de versionamento — só aparece a partir da versão 2. */
export function avisoVersao(versao: number): string | null {
  if (versao <= 1) return null;
  return `Versão ${versao} — substitui e cancela a versão anterior.`;
}
