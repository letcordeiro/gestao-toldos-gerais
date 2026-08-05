// FONTE ÚNICA do texto do contrato.
// A prévia em HTML e o PDF renderizam a MESMA estrutura devolvida por
// `montarClausulas` — nenhuma frase é escrita duas vezes.

import { valorPorExtenso } from "./valor-extenso";
import {
  ESCOPO_LABEL,
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
  };
  itens: Array<{
    modelo: string;
    cor: string | null;
    medidasM2: string | null;
    descricaoExtra: string | null;
  }>;
  pagamentos: LinhaPagamento[];
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

/** Uma linha do plano de pagamento vira uma frase legível do contrato. */
export function frasePagamento(linha: LinhaPagamento): string {
  const partes = [`${linha.rotulo}: ${moedaComExtenso(linha.valor)}`];
  if (linha.numeroParcelas > 1) {
    partes.push(
      `em ${linha.numeroParcelas}x no ${MEIO_LABEL[linha.meio]}`
    );
  } else {
    partes.push(`por meio de ${MEIO_LABEL[linha.meio]}`);
  }
  partes.push(
    frasePorGatilho(linha.gatilho, linha.diasApos, linha.dataVencimento)
  );
  return `${partes.join(", ")}.`;
}

export type Clausula = {
  titulo: string;
  paragrafos: string[];
  /** Itens em lista (a, b, c) dentro da cláusula. */
  itens?: string[];
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
  if (dados.observacoesTecnicas?.trim()) {
    objeto.paragrafos.push(
      `Observações técnicas: ${dados.observacoesTecnicas.trim()}`
    );
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
  const pagamento: Clausula = {
    titulo: "DO VALOR E DA FORMA DE PAGAMENTO",
    paragrafos: [
      `O valor total do presente contrato é de ${moedaComExtenso(
        dados.valorTotal
      )}, compreendendo o fornecimento dos materiais e a mão de obra de instalação.`,
      "O pagamento será realizado da seguinte forma:",
    ],
    itens: dados.pagamentos.map(frasePagamento),
  };
  // "Sinal" só é mencionado quando existe de fato e é menor que o total.
  const sinal = dados.pagamentos.find((p) => p.tipo === "sinal");
  if (sinal && sinal.valor < dados.valorTotal) {
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
      "reparar, dentro do prazo de garantia, os defeitos de fabricação ou de instalação que lhe forem imputáveis.",
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
      "obter, quando exigível, autorização do condomínio, do proprietário ou do poder público para a instalação.",
    ],
  };
  if (dados.flagEnergia) {
    obrigacoesContratante.itens!.push(
      "disponibilizar ponto de energia elétrica adequado no local, sem ônus para a CONTRATADA, " +
        "inclusive para os produtos motorizados, quando for o caso."
    );
  }
  clausulas.push(obrigacoesContratante);

  // 6 — INADIMPLÊNCIA
  clausulas.push({
    titulo: "DA INADIMPLÊNCIA E DO ATRASO",
    paragrafos: [
      `O atraso no pagamento de qualquer parcela sujeita o CONTRATANTE ao pagamento de multa de ` +
        `${formatarPercent(dados.multaPercent)}% sobre o valor em atraso, acrescida de juros de mora de ` +
        `${formatarPercent(dados.jurosMesPercent)}% ao mês, calculados pro rata die, sem prejuízo da correção monetária.`,
      "O atraso superior a 30 (trinta) dias autoriza a CONTRATADA a suspender a fabricação ou a instalação " +
        "até a regularização, ficando os prazos automaticamente prorrogados pelo período da suspensão.",
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

  // 10 — FORO
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
  }
): { contratada: string; contratante: string } {
  return {
    contratada:
      `${empresa.razaoSocial}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ` +
      `${empresa.cnpj}, com sede em ${empresa.endereco}, neste ato representada por ` +
      `${dados.representante}, doravante denominada CONTRATADA;`,
    contratante:
      `${dados.contratante.nome}, inscrito(a) no CPF/CNPJ sob o nº ` +
      `${dados.contratante.documento ?? "____________________"}, residente e domiciliado(a) em ` +
      `${dados.contratante.endereco ?? "____________________"}` +
      `${dados.contratante.telefone ? `, telefone ${dados.contratante.telefone}` : ""}` +
      `${dados.contratante.email ? `, e-mail ${dados.contratante.email}` : ""}, ` +
      `doravante denominado(a) CONTRATANTE.`,
  };
}

/** Cabeçalho de versionamento — só aparece a partir da versão 2. */
export function avisoVersao(versao: number): string | null {
  if (versao <= 1) return null;
  return `Versão ${versao} — substitui e cancela a versão anterior.`;
}
