/**
 * Telas que não estão no menu mas moram dentro de um item dele.
 *
 * O contrato (`/contratos/[id]`) é tela própria, mas a LISTA de contratos foi
 * absorvida pela de Orçamentos. Sem isto, lendo um contrato nenhum item do
 * menu ficava aceso e a pessoa perdia a referência de onde estava.
 */
const TAMBEM: Record<string, string[]> = {
  "/orcamentos": ["/contratos"],
};

const dentro = (path: string, href: string) =>
  path === href || path.startsWith(`${href}/`);

/** O item do menu com este `href` deve aparecer aceso nesta rota? */
export function rotaAtiva(path: string, href: string): boolean {
  return dentro(path, href) || (TAMBEM[href] ?? []).some((h) => dentro(path, h));
}
