import { redirect } from "next/navigation";

/**
 * A lista de contratos deixou de existir (27/08/2026).
 *
 * Ela repetia cliente, valor e data da lista de orçamentos e trazia uma coluna
 * "Orçamento" que só apontava de volta para lá. Agora o contrato aparece como
 * uma coluna na lista de orçamentos, com filtro por situação — e a tela do
 * contrato (`/contratos/[id]`) continua existindo, alcançada pelo selo.
 *
 * A rota fica como redirect porque link antigo (favorito, aba aberta, mensagem
 * de WhatsApp com o endereço) não pode virar página de erro.
 */
export default function ContratosPage() {
  redirect("/orcamentos?contrato=com");
}
