// Regras da pesquisa de satisfação. Módulo puro — o NPS é conta, e conta
// errada em relatório de satisfação estraga decisão.

export type Classe = "promotor" | "neutro" | "detrator";

export const CLASSE_LABEL: Record<Classe, string> = {
  promotor: "Promotores",
  neutro: "Neutros",
  detrator: "Detratores",
};

export const CLASSE_COR: Record<Classe, string> = {
  promotor: "#10B981",
  neutro: "#F59E0B",
  detrator: "#EF4444",
};

/** Faixas do NPS: 9–10 promotor, 7–8 neutro, 0–6 detrator. */
export function classificar(nota: number): Classe {
  if (nota >= 9) return "promotor";
  if (nota >= 7) return "neutro";
  return "detrator";
}

export type ResumoNps = {
  respostas: number;
  promotores: number;
  neutros: number;
  detratores: number;
  /** −100 a 100. Null quando ninguém respondeu. */
  nps: number | null;
  /** Média simples das notas. Null quando ninguém respondeu. */
  media: number | null;
};

/**
 * NPS = % de promotores − % de detratores, arredondado.
 * Neutro conta no total (dilui), mas não soma nem subtrai.
 */
export function calcularNps(notas: number[]): ResumoNps {
  const validas = notas.filter((n) => Number.isInteger(n) && n >= 0 && n <= 10);
  const total = validas.length;
  if (total === 0) {
    return {
      respostas: 0,
      promotores: 0,
      neutros: 0,
      detratores: 0,
      nps: null,
      media: null,
    };
  }
  const promotores = validas.filter((n) => classificar(n) === "promotor").length;
  const neutros = validas.filter((n) => classificar(n) === "neutro").length;
  const detratores = validas.filter((n) => classificar(n) === "detrator").length;
  return {
    respostas: total,
    promotores,
    neutros,
    detratores,
    nps: Math.round(((promotores - detratores) / total) * 100),
    media: Math.round((validas.reduce((s, n) => s + n, 0) / total) * 10) / 10,
  };
}

/** Como ler o número — evita "NPS 40" não querer dizer nada para quem vê. */
export function faixaNps(nps: number | null): string {
  if (nps == null) return "sem respostas ainda";
  if (nps >= 75) return "excelente";
  if (nps >= 50) return "muito bom";
  if (nps >= 0) return "razoável";
  return "ruim — mais detratores que promotores";
}
