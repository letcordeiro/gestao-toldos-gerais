// Fonte única dos dados de seed — importada pelo seed de dev (src/db/seed.ts)
// e pelo init do container (scripts/init-db.mjs).

export const FASES = [
  { nome: "Novo lead", ordem: 1, cor: "#3B82F6" },
  { nome: "Visita técnica", ordem: 2, cor: "#8B5CF6" },
  { nome: "Orçamento enviado", ordem: 3, cor: "#F59E0B" },
  { nome: "Negociação", ordem: 4, cor: "#F97316" },
  { nome: "Aguardando pagamento", ordem: 5, cor: "#EAB308" },
  { nome: "Em produção", ordem: 6, cor: "#06B6D4" },
  { nome: "Instalação agendada", ordem: 7, cor: "#10B981" },
  { nome: "Concluído", ordem: 8, cor: "#004E36" },
  { nome: "Perdido", ordem: 9, cor: "#EF4444" },
];

// Toldo Retrátil Cortina: textos de referência do orçamento real.
// Demais modelos: completar descrições com o João.
export const MODELOS = [
  {
    nome: "Toldo Retrátil Cortina",
    descricaoMaterial:
      "Cobertura em lona vinílica (PVC) importada, blackout, com tratamento antifungo e proteção UV, alta resistência a intempéries. Cores conforme mostruário do fabricante.",
    estruturaAluminio:
      "Estrutura em alumínio com tubos e perfis de alta resistência, guias laterais em alumínio, sistema retrátil com acionamento por manivela ou motorização. Componentes com tratamento anticorrosivo.",
    estruturaFerro:
      "Estrutura em ferro (metalon) com tratamento antiferrugem (fundo antioxidante) e pintura de acabamento na cor definida pelo cliente, guias laterais e sistema retrátil com acionamento por manivela.",
    fixacaoVedacao:
      "Fixação em alvenaria ou estrutura existente com parabolts e buchas adequadas ao substrato. Vedação entre a estrutura e a parede com rufos e aplicação de silicone/PU, garantindo estanqueidade.",
  },
  { nome: "Toldos em Lona" },
  {
    nome: "Toldos Italianos e Motorização",
    estruturaSempreAluminio: true,
    usaFormato: true,
  },
  { nome: "Lonas Tensionadas" },
  { nome: "Sombreadores" },
  { nome: "Cobertura Termoacústica (telha sanduíche)" },
  { nome: "Coberturas Metálicas" },
  { nome: "Cobertura de Policarbonato e Vidro" },
  { nome: "Estrutura Geodésica" },
  { nome: "Coberturas Móveis" },
];

export const VENDEDORES = [
  {
    nome: "João Avelar",
    telefone: "(31) 99864-3502",
    email: "avelarjoao@toldosgerais.com.br",
  },
];
