// Ordenação de tabela por coluna — regras puras, sem banco nem React.
//
// Usada pelas listas do sistema. A ordenação acontece em memória, depois da
// consulta, porque várias colunas são calculadas (tempo em fase, total do
// orçamento, ordem do funil) e não existem como coluna no SQL.

export type Direcao = "asc" | "desc";

/** Qualquer coisa diferente de "desc" é crescente — inclusive ausente. */
export function direcaoDe(dir: string | undefined): Direcao {
  return dir === "desc" ? "desc" : "asc";
}

/** O que dá para extrair de uma linha para comparar. */
export type Valor = string | number | Date | null | undefined;

/**
 * Compara dois valores. Vazio (null/undefined/"") vai sempre para o fim,
 * independente do sentido — senão ordenar por uma coluna com buracos enche a
 * primeira tela de linhas em branco.
 */
export function compararValores(a: Valor, b: Valor, dir: Direcao): number {
  const vazio = (v: Valor) => v == null || v === "";
  if (vazio(a) && vazio(b)) return 0;
  if (vazio(a)) return 1;
  if (vazio(b)) return -1;

  const sinal = dir === "desc" ? -1 : 1;
  const na = a instanceof Date ? a.getTime() : a;
  const nb = b instanceof Date ? b.getTime() : b;

  if (typeof na === "number" && typeof nb === "number") {
    return sinal * (na - nb);
  }
  return sinal * String(na).localeCompare(String(nb), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Ordena a lista pela coluna pedida. Sem coluna (ou coluna desconhecida),
 * devolve a lista como veio — a ordem padrão de cada tela continua valendo.
 * Nunca altera o array original.
 */
export function ordenarLista<T>(
  lista: readonly T[],
  chave: string | undefined,
  dir: string | undefined,
  campos: Record<string, (item: T) => Valor>
): T[] {
  const extrair = chave ? campos[chave] : undefined;
  if (!extrair) return [...lista];
  const direcao = direcaoDe(dir);
  return [...lista].sort((a, b) =>
    compararValores(extrair(a), extrair(b), direcao)
  );
}

/**
 * Link da próxima ordenação: a coluna que já está ativa inverte o sentido,
 * as outras começam crescentes.
 */
export function linkDaColuna(
  base: string,
  chave: string,
  ordem: string | undefined,
  dir: string | undefined,
  extras: Record<string, string | undefined> = {},
  // Tela com duas tabelas precisa de um par de parâmetros para cada uma.
  nomeOrdem = "ordem",
  nomeDir = "dir"
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(extras)) if (v) params.set(k, v);
  params.set(nomeOrdem, chave);
  if (ordem === chave && direcaoDe(dir) === "asc") params.set(nomeDir, "desc");
  return `${base}?${params.toString()}`;
}
