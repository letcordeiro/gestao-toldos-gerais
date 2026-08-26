// Dados oficiais da Toldos Gerais Ltda — usados na proposta, no rodapé e nas
// páginas públicas. O contrato tem emitente próprio (EMPRESA_CONTRATO, abaixo).
export const EMPRESA = {
  razaoSocial: "Toldos Gerais Ltda",
  cnpj: "02.873.343/0001-96",
  site: "www.toldosgerais.com.br",
  endereco:
    "Rua Carmelita Prates da Silva, 501 – Salgado Filho – CEP 30550-110 – Belo Horizonte/MG",
  telefoneFixo: "(31) 3646-1145",
  whatsapp: "(31) 99614-6810",
  whatsappNumero: "5531996146810", // formato wa.me
  emailVendas: "vendas@toldosgerais.com.br",
  emailSac: "sac@toldosgerais.com.br",
  instagram: "@toldosgerais",
  // Link de avaliação no Google usado na mensagem de pós-venda.
  googleReview: "https://share.google/sRi1Eq9sindozHg2Z",
} as const;

/**
 * Emitente dos CONTRATOS (a partir de 26/08/2026).
 *
 * O contrato de fornecimento e instalação passa a sair no nome da Comercial
 * Mari Ltda (Distribuidora Alvorada) — logo, qualificação da CONTRATADA e
 * rodapé. Orçamento, proposta e as páginas públicas continuam na Toldos
 * Gerais: só o contrato mudou de emitente.
 */
export const EMPRESA_CONTRATO = {
  razaoSocial: "Comercial Mari Ltda",
  nomeFantasia: "Distribuidora Alvorada",
  cnpj: "41.415.580/0001-65",
  inscricaoEstadual: "0040120360063",
  endereco:
    "Rua Estoril, 1724 – São Francisco – CEP 31255-190 – Belo Horizonte/MG",
  telefoneFixo: "(31) 3441-3900",
  email: "distribuidorabhza@gmail.com",
  contato: "Mariana Curvelano",
  regimeTributario: "Empresa optante pelo Simples Nacional",
  // Arquivo em public/ — lido por gerarContrato e embutido no PDF.
  logoArquivo: "logo-alvorada.png",
} as const;
