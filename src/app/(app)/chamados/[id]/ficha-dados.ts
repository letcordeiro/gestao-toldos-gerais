import "server-only";
import { usuarioAtual } from "@/lib/auth";
import { dadosDaOrdem, type OrdemCarregada } from "@/lib/gerar-ordem-manutencao";

/**
 * Carrega a ficha SE quem pediu pode vê-la.
 *
 * A regra — vendedor só alcança a ficha dos próprios clientes — vale para ver,
 * imprimir e baixar. Estava escrita igual em cada tela; uma tela nova era uma
 * chance de esquecer. Aqui é uma linha só, no mesmo lugar.
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
    carregada.vendedorId !== usuario.vendedorId
  ) {
    return null;
  }
  return carregada;
}
