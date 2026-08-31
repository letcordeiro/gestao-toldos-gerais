// Ordem e busca da lista de clientes — regras puras, sem React.
//
// Vive aqui e não dentro do componente porque é o que decide se quem digita
// "carlos" acha o cliente: errar isso não quebra a tela, só faz o cliente
// sumir, que é o tipo de defeito que ninguém percebe até alguém reclamar.

/** Sem acento e em minúsculas: "goncalves" tem que achar "Gonçalves". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Ordem alfabética de gente, do jeito do português (á junto de a, ç junto de c). */
export function compararNomes(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });
}

/**
 * Filtra pelo que foi digitado.
 *
 * Casa em QUALQUER parte do texto, não só no começo: "carlos" precisa achar
 * "João Carlos Ferreira", senão a busca só serve para quem já sabe o primeiro
 * nome. Cada palavra digitada tem que aparecer, em qualquer ordem — assim
 * "carlos ferreira" e "ferreira carlos" chegam no mesmo lugar.
 */
export function combinaBusca(texto: string, busca: string): boolean {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;
  const alvo = normalizar(texto);
  return termos.every((t) => alvo.includes(t));
}
