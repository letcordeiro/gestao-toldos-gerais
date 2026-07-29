// Dias após o envio do orçamento para lembrar de cobrar retorno do cliente.
// Configurável por env COBRANCA_DIAS (padrão 3) — permite ajustar a janela
// sem mexer no código. "Já contatei" silencia por mais um ciclo deste tamanho.
export const DIAS_COBRANCA = (() => {
  const n = Number(process.env.COBRANCA_DIAS);
  return Number.isFinite(n) && n >= 0 ? n : 3;
})();
