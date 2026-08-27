// Formato do número dos documentos (orçamento, contrato). Módulo puro.
//
// O SEQUENCIAL continua saindo dos números que já existem, não de um contador
// guardado. Contador em tabela desencontra do banco quando alguém apaga um
// registro ou restaura um backup; derivar do que existe nunca gera número
// repetido.

export type DocumentoNumerado = "orcamento" | "contrato";

export const DOCUMENTO_LABEL: Record<DocumentoNumerado, string> = {
  orcamento: "Orçamento",
  contrato: "Contrato",
};

export type ConfigNumeracao = {
  /** Texto antes do número. Ex.: "CT". Vazio = sem prefixo. */
  prefixo: string;
  /** Inclui o ano entre o prefixo e o sequencial. */
  incluiAno: boolean;
  /** Zeros à esquerda. 3 → 001. */
  digitos: number;
};

export const PADRAO: Record<DocumentoNumerado, ConfigNumeracao> = {
  // Formatos históricos da Toldos: 2026-001 e CT-2026-0001.
  orcamento: { prefixo: "", incluiAno: true, digitos: 3 },
  contrato: { prefixo: "CT", incluiAno: true, digitos: 4 },
};

/** Parte fixa do número — o que vem antes do sequencial. */
export function prefixoCompleto(config: ConfigNumeracao, ano: number): string {
  const partes = [config.prefixo.trim(), config.incluiAno ? String(ano) : ""]
    .filter(Boolean);
  return partes.length > 0 ? `${partes.join("-")}-` : "";
}

export function formatarNumero(
  config: ConfigNumeracao,
  sequencial: number,
  ano: number
): string {
  const digitos = Math.min(Math.max(config.digitos, 1), 10);
  return `${prefixoCompleto(config, ano)}${String(sequencial).padStart(digitos, "0")}`;
}

/**
 * Próximo número, a partir dos que já existem.
 *
 * Só considera os que batem com o prefixo atual: mudar o formato no meio do
 * ano começa uma sequência nova em vez de continuar de onde a antiga parou —
 * e o número antigo continua válido no documento já emitido.
 */
export function proximoNumero(
  numerosExistentes: readonly (string | null)[],
  config: ConfigNumeracao,
  ano: number
): string {
  const prefixo = prefixoCompleto(config, ano);
  const maior = numerosExistentes.reduce<number>((max, numero) => {
    if (!numero || !numero.startsWith(prefixo)) return max;
    const seq = parseInt(numero.slice(prefixo.length), 10);
    return Number.isFinite(seq) ? Math.max(max, seq) : max;
  }, 0);
  return formatarNumero(config, maior + 1, ano);
}

/** Exemplo mostrado na tela de configuração. */
export function exemplo(config: ConfigNumeracao, ano: number): string {
  return formatarNumero(config, 1, ano);
}
