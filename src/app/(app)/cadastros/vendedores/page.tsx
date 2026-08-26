import { permanentRedirect } from "next/navigation";

/**
 * A tela virou "Usuários" (cabem gestor, atendente e vendedor). O endereço
 * antigo continua funcionando para não quebrar link salvo no navegador.
 */
export default function VendedoresRedirect() {
  permanentRedirect("/cadastros/usuarios");
}
