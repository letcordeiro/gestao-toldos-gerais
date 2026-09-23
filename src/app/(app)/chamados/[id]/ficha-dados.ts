import "server-only";
import { usuarioAtual } from "@/lib/auth";
import { vendedorVeChamado } from "@/lib/chamados";
import { dadosDaOrdem, type OrdemCarregada } from "@/lib/gerar-ordem-manutencao";

/**
 * Carrega a ficha SE quem pediu pode vê-la.
 *
 * A regra de quem vê é `vendedorVeChamado` — a mesma da lista e da tela do
 * chamado. Estava escrita em cada tela, e cada tela nova era uma chance de
 * esquecer (a tela do chamado esqueceu).
 */
export async function fichaPermitida(
  chamadoId: number
): Promise<OrdemCarregada | null> {
  if (!Number.isInteger(chamadoId)) return null;
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  const carregada = await dadosDaOrdem(chamadoId);
  if (!carregada) return null;
  if (
    usuario.papel === "vendedor" &&
    !vendedorVeChamado(
      {
        responsavelId: carregada.responsavelId,
        vendedorDoAtendimentoId: carregada.vendedorId,
      },
      usuario.vendedorId
    )
  ) {
    return null;
  }
  return carregada;
}
