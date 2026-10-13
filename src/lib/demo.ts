// Modo demonstração (DEMO=1): roda só no app demo-toldos.cordena.net, com o
// banco fictício de scripts/seed-demo.mjs. NUNCA ligar no app de produção —
// os botões de "entrar como" dispensam senha.

import type { Papel } from "./papeis";

export function ehDemo(): boolean {
  return process.env.DEMO === "1";
}

/** Contas fictícias da demo. Os e-mails têm que ser os de seed-demo.mjs. */
export const CONTAS_DEMO: { papel: Papel; email: string; nome: string; resumo: string }[] = [
  {
    papel: "gestor",
    email: "gestora@demo.toldos",
    nome: "Marina Duarte",
    resumo: "Vê tudo e configura o sistema",
  },
  {
    papel: "atendente",
    email: "atendente@demo.toldos",
    nome: "Ana Lúcia Prado",
    resumo: "Recebe clientes e marca visitas",
  },
  {
    papel: "vendedor",
    email: "vendedor@demo.toldos",
    nome: "Carlos Menezes",
    resumo: "Vê só os clientes dele",
  },
];
