import { EMPRESA } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/whatsapp";

// Dias após a conclusão para lembrar do contato de pós-venda.
// Configurável por env POS_VENDA_DIAS (padrão 7) — permite ajustar a janela
// sem mexer no código.
export const DIAS_POS_VENDA = (() => {
  const n = Number(process.env.POS_VENDA_DIAS);
  return Number.isFinite(n) && n >= 0 ? n : 7;
})();

/** Mensagem de pós-venda: agradece, pede opinião e convida a avaliar no Google. */
export function mensagemPosVenda(
  clienteNome: string,
  vendedorNome: string | null
): string {
  const primeiroNome = clienteNome.split(" ")[0];
  const assina = vendedorNome ? `${vendedorNome.split(" ")[0]}, da ` : "";
  return [
    `Olá, ${primeiroNome}! Aqui é ${assina}Toldos Gerais. 😊`,
    "",
    "Já faz alguns dias que concluímos a instalação e passamos para saber: está tudo certo com o seu toldo? O que você achou do nosso atendimento e do serviço?",
    "",
    "Sua opinião ajuda muito a gente a melhorar. E, se puder, deixa uma avaliação rápida no Google — leva menos de 1 minuto e faz toda a diferença pra nós:",
    EMPRESA.googleReview,
    "",
    "Muito obrigado pela confiança! Qualquer coisa, é só chamar. 🙌",
  ].join("\n");
}

/** Link wa.me pronto para o contato de pós-venda. */
export function linkPosVenda(
  telefone: string,
  clienteNome: string,
  vendedorNome: string | null
): string {
  return linkWhatsApp(telefone, mensagemPosVenda(clienteNome, vendedorNome));
}
