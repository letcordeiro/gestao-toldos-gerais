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

  const partes: string[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    const escala = ESCALAS[i];
    if (i === 0) {
      partes.push(grupoPorExtenso(g));
    } else if (i === 1) {
      // "mil" não leva "um" na frente: 1000 = "mil", 2000 = "dois mil".
      partes.push(g === 1 ? "mil" : `${grupoPorExtenso(g)} mil`);
    } else {
      partes.push(
        `${grupoPorExtenso(g)} ${g === 1 ? escala.singular : escala.plural}`
      );
    }
  }

  // Regra do "e" em português: liga o último grupo quando ele é menor que 100
  // ou múltiplo exato de 100 (mil e quinhentos, dois mil e trezentos), mas não
  // quando tem 3 dígitos "cheios" (mil duzentos e trinta e quatro).
  let texto = partes[0];
  for (let i = 1; i < partes.length; i++) {
    const idxGrupo = grupos.length - 1 - i;
    const valorGrupo = grupos[idxGrupo];
    const ligaComE =
      idxGrupo === 0 && (valorGrupo < 100 || valorGrupo % 100 === 0);
    texto += ligaComE ? ` e ${partes[i]}` : ` ${partes[i]}`;
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
    partes.push(`${numeroPorExtenso(reais)} ${reais === 1 ? "real" : "reais"}`);
  }
  if (cents > 0) {
    partes.push(
      `${numeroPorExtenso(cents)} ${cents === 1 ? "centavo" : "centavos"}`
    );
  }
  if (partes.length === 0) return "zero real";
  const texto = partes.join(" e ");
  return negativo ? `menos ${texto}` : texto;
}
