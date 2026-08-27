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

// Motivos de perda — a lista precisa nascer preenchida, senão a pergunta
// "por que perdeu?" aparece vazia na primeira vez que alguém perde um negócio.
export const MOTIVOS_PERDA = [
  { nome: "Preço acima do que o cliente queria pagar", ordem: 1 },
  { nome: "Fechou com concorrente", ordem: 2 },
  { nome: "Desistiu da obra", ordem: 3 },
  { nome: "Adiou para depois", ordem: 4 },
  { nome: "Sumiu / não respondeu", ordem: 5 },
  { nome: "Fora da nossa área de atendimento", ordem: 6 },
  { nome: "Não fazemos esse tipo de serviço", ordem: 7 },
];

// Automações padrão. São o motivo de o módulo existir: o follow-up de
// orçamento e o pós-venda deixam de depender de alguém lembrar.
// faseNome é resolvido para o id na hora do seed.
export const GATILHOS = [
  {
    nome: "Follow-up do orçamento",
    evento: "entrou_na_fase",
    faseNome: "Orçamento enviado",
    tarefaTipo: "whatsapp",
    tarefaTitulo: "Perguntar se o cliente viu a proposta",
    tarefaPrioridade: "alta",
    prazoDias: 3,
    mensagem:
      "Olá, {cliente}! Aqui é {vendedor}, da Toldos Gerais. Passando para saber se você conseguiu ver a proposta {orcamento} que te enviei. Qualquer dúvida, estou à disposição!",
  },
  {
    nome: "Confirmar a visita técnica",
    evento: "entrou_na_fase",
    faseNome: "Visita técnica",
    tarefaTipo: "ligacao",
    tarefaTitulo: "Combinar dia e hora da visita",
    tarefaPrioridade: "alta",
    prazoDias: 1,
    mensagem: null,
  },
  {
    nome: "Cobrar assinatura do contrato",
    evento: "contrato_emitido",
    faseNome: null,
    tarefaTipo: "whatsapp",
    tarefaTitulo: "Cobrar a assinatura do contrato",
    tarefaPrioridade: "alta",
    prazoDias: 3,
    mensagem:
      "Olá, {cliente}! Aqui é {vendedor}, da Toldos Gerais. Passando para lembrar do contrato {orcamento} que te enviei para assinatura. Precisa de alguma coisa para seguir?",
  },
  {
    nome: "Pós-venda depois da instalação",
    evento: "entrou_na_fase",
    faseNome: "Concluído",
    tarefaTipo: "whatsapp",
    tarefaTitulo: "Confirmar se ficou tudo certo e pedir avaliação",
    tarefaPrioridade: "media",
    prazoDias: 7,
    mensagem:
      "Olá, {cliente}! Aqui é {vendedor}, da Toldos Gerais. Ficou tudo certo com a instalação? Se puder deixar sua avaliação, ajuda muito a gente: {avaliacao}",
  },
];
