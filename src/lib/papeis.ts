// Papéis de acesso — regras puras, sem banco nem sessão, para poder testar.

/**
 * gestor    — faz tudo, inclusive os cadastros de configuração.
 * atendente — a secretária: cadastra cliente, abre atendimento e escolhe o
 *             vendedor. Enxerga o funil inteiro, mas não cria orçamento nem
 *             contrato e não mexe em modelos, fases, avisos ou vendedores.
 * vendedor  — só os próprios atendimentos, orçamentos e contratos.
 */
export type Papel = "gestor" | "atendente" | "vendedor";

export const PAPEL_LABEL: Record<Papel, string> = {
  gestor: "gestor",
  atendente: "atendente",
  vendedor: "vendedor",
};

/** Enxerga o funil inteiro, não só o que é seu. */
export function veFunilInteiro(papel: Papel): boolean {
  return papel === "gestor" || papel === "atendente";
}

/** Cria e edita orçamento e contrato. A atendente faz triagem, não comercial. */
export function podeComercial(papel: Papel): boolean {
  return papel !== "atendente";
}
