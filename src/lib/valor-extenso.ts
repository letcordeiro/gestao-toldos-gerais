// Valor monetário por extenso em pt-BR, para os contratos.
// Entrada sempre em CENTAVOS (integer) — nunca float.

const UNIDADES = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

// Escalas na ordem em que os grupos de 3 dígitos aparecem (do maior ao menor).
const ESCALAS: { singular: string; plural: string }[] = [
  { singular: "", plural: "" },
  { singular: "mil", plural: "mil" },
  { singular: "milhão", plural: "milhões" },
  { singular: "bilhão", plural: "bilhões" },
  { singular: "trilhão", plural: "trilhões" },
];

/** Escreve um grupo de 1 a 999 por extenso. */
function grupoPorExtenso(n: number): string {
  if (n === 100) return "cem";
  const partes: string[] = [];
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 20) {
      partes.push(UNIDADES[resto]);
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

/** Número inteiro (0 a 999 trilhões) por extenso. */
export function numeroPorExtenso(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("numeroPorExtenso espera um inteiro não negativo");
  }
  if (n === 0) return "zero";

  // Quebra em grupos de 3 dígitos, do menos significativo para o mais.
  const grupos: number[] = [];
  let resto = n;
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }
  if (grupos.length > ESCALAS.length) {
    throw new Error("numeroPorExtenso: valor acima do suportado");
  }

  // Cada parte guarda o valor do SEU grupo. Antes o "e" olhava o grupo pela
  // posição na lista de partes, que pula grupo zerado: 1.000.500 saía "um
  // milhão quinhentos", sem o "e" (auditoria de 07/10/2026).
  const partes: { texto: string; valor: number }[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    const escala = ESCALAS[i];
    if (i === 0) {
      partes.push({ texto: grupoPorExtenso(g), valor: g });
    } else if (i === 1) {
      // "mil" não leva "um" na frente: 1000 = "mil", 2000 = "dois mil".
      partes.push({ texto: g === 1 ? "mil" : `${grupoPorExtenso(g)} mil`, valor: g });
    } else {
      partes.push({
        texto: `${grupoPorExtenso(g)} ${g === 1 ? escala.singular : escala.plural}`,
        valor: g,
      });
    }
  }

  // Regra do "e" em português: liga a ÚLTIMA parte quando o grupo dela é menor
  // que 100 ou múltiplo exato de 100 (mil e quinhentos, um milhão e
  // quinhentos, um milhão e duzentos mil), mas não quando tem 3 dígitos
  // "cheios" (mil duzentos e trinta e quatro).
  let texto = partes[0].texto;
  for (let i = 1; i < partes.length; i++) {
    const { texto: parte, valor } = partes[i];
    const ligaComE =
      i === partes.length - 1 && (valor < 100 || valor % 100 === 0);
    texto += ligaComE ? ` e ${parte}` : ` ${parte}`;
  }
  return texto;
}

/**
 * Valor em centavos por extenso, com moeda:
 * 199500 → "mil novecentos e noventa e cinco reais"
 * 100    → "um real"
 * 150    → "um real e cinquenta centavos"
 */
export function valorPorExtenso(centavos: number): string {
  if (!Number.isInteger(centavos)) {
    throw new Error("valorPorExtenso espera centavos inteiros");
  }
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const reais = Math.floor(abs / 100);
  const cents = abs % 100;

  const partes: string[] = [];
  if (reais > 0) {
    // Milhão/bilhão redondo pede "de": "um milhão de reais", não "um milhão
    // reais" (auditoria de 07/10/2026).
    const de = reais >= 1_000_000 && reais % 1_000_000 === 0 ? "de " : "";
    partes.push(
      `${numeroPorExtenso(reais)} ${de}${reais === 1 ? "real" : "reais"}`
    );
  }
  if (cents > 0) {
    partes.push(
      `${numeroPorExtenso(cents)} ${cents === 1 ? "centavo" : "centavos"}`
    );
  }
  // Zero é plural em português: "zero reais" (auditoria de 07/10/2026).
  if (partes.length === 0) return "zero reais";
  const texto = partes.join(" e ");
  return negativo ? `menos ${texto}` : texto;
}
