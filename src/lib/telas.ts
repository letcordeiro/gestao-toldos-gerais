// Busca de telas — regras puras, sem React.
//
// O sistema passou de trinta telas e só seis cabem na barra: o resto mora
// dentro do menu "Mais", em grupos. Quem sabe o NOME do que quer não devia
// precisar lembrar em qual gaveta a tela foi guardada.
//
// O filtro vive aqui, fora do componente, porque errar ele não quebra nada
// visível: a tela simplesmente não aparece na busca, que é o tipo de defeito
// que ninguém percebe até alguém reclamar. Mesmo motivo de `busca-cliente.ts`.

import { combinaBusca, compararNomes, normalizar } from "./busca-cliente";

export type Tela = {
  href: string;
  label: string;
  /** A mesma frase de ajuda do menu — também entra na busca. */
  ajuda: string;
  /** De onde ela vem no menu, mostrado ao lado do resultado. */
  grupo: string;
};

/**
 * Como as telas são chamadas quando ninguém está olhando para o menu.
 *
 * O rótulo do menu é UM nome; na boca de quem usa são vários. Quem procura
 * garantia quer Chamados, quem procura agenda quer Visitas, e quem procura
 * "contrato" quer a lista de orçamentos — foi lá que a de contratos foi parar.
 * Sem esta lista a busca só serve para quem já sabe o nome oficial, e aí ela
 * não resolve o problema que existe para resolver.
 */
const APELIDOS: Record<string, string[]> = {
  "/painel": ["inicio", "home", "dashboard", "resumo do dia", "numeros"],
  "/atendimentos": ["funil", "lead", "contato", "novo cliente", "whatsapp"],
  "/orcamentos": ["proposta", "contrato", "minuta", "assinatura", "pdf"],
  "/visitas": ["agenda", "medicao", "horario", "calendario", "visita tecnica"],
  "/instalacoes": ["obra", "montagem", "entrega", "instalador"],
  "/tarefas": ["pendencia", "lembrete", "afazeres"],
  "/chamados": [
    "manutencao",
    "garantia",
    "assistencia",
    "pos venda",
    "ordem de manutencao",
    "defeito",
    "reclamacao",
  ],
  "/cadastros/clientes": ["telefone", "endereco", "cpf", "cnpj", "cadastro"],
  "/cotacoes": ["fornecedor", "preco de material", "compra"],
  "/pesquisas": ["nps", "avaliacao", "nota do cliente"],
  "/cadastros/fases": ["etapa", "funil", "status"],
  "/cadastros/gatilhos": ["gatilho", "tarefa automatica", "robo"],
  "/cadastros/avisos": ["lembrete de whatsapp", "cobranca de resposta"],
  "/cadastros/canais": ["origem", "indicacao", "instagram", "de onde veio"],
  "/cadastros/motivos-perda": ["perdido", "recusado", "caiu"],
  "/cadastros/resumos": ["e-mail", "relatorio diario"],
  "/cadastros/modelos": ["toldo", "produto", "texto da proposta"],
  "/cadastros/fornecedores": ["compra", "material"],
  "/cadastros/instaladores": ["montador", "comissao"],
  "/cadastros/log-dinheiro": ["dinheiro", "baixa", "recebimento", "caixa"],
  "/cadastros/numeracoes": ["numero", "sequencia"],
  "/cadastros/usuarios": ["senha", "permissao", "acesso", "login", "vendedor"],
  "/perfil": ["minha conta", "senha", "agenda do google", "google"],
  "/orcamentos/novo": ["criar proposta", "fazer orcamento"],
  "/cotacoes/nova": ["pedir preco"],
  "/instalacoes/comissoes": ["comissao", "pagar instalador"],
};

/**
 * Telas que NÃO estão no menu de propósito — chega-se nelas por botão dentro
 * de outra tela. Ficam de fora de `layout.tsx` porque `teste-menu.mjs` lê os
 * `href:` de lá para achar item de menu apontando para tela que não existe;
 * repetir estas rotas ali confundiria o teste sem necessidade.
 *
 * `so` é quem enxerga: o guard da própria tela já redireciona quem não pode,
 * mas oferecer na busca o que a pessoa não vai conseguir abrir é sujeira.
 */
export type TelaExtra = Tela & { so?: "gestor" | "comercial" | "vendedor" };

export const TELAS_EXTRAS: TelaExtra[] = [
  {
    href: "/perfil",
    label: "Meu perfil",
    ajuda: "Sua senha, seus dados e a agenda do Google",
    grupo: "Você",
    so: "vendedor",
  },
  {
    href: "/orcamentos/novo",
    label: "Novo orçamento",
    ajuda: "Começar uma proposta do zero",
    grupo: "Atalhos",
    so: "comercial",
  },
  {
    href: "/cotacoes/nova",
    label: "Nova cotação",
    ajuda: "Pedir preço de material a vários fornecedores",
    grupo: "Atalhos",
    so: "comercial",
  },
  {
    href: "/instalacoes/comissoes",
    label: "Comissões",
    ajuda: "Quanto a empresa deve a cada instalador",
    grupo: "Atalhos",
    so: "gestor",
  },
];

/**
 * Quanto uma tela combina com o que foi digitado. Zero = não aparece.
 *
 * A ordem importa mais aqui do que na busca de cliente: quem digita "orc"
 * quer Orçamentos como PRIMEIRO resultado, não "Motivos de perda" porque a
 * ajuda dela fala em orçamento. Por isso o rótulo pesa mais que o resto.
 */
function peso(tela: Tela, busca: string): number {
  const termo = normalizar(busca);
  const rotulo = normalizar(tela.label);
  if (rotulo.startsWith(termo)) return 3;
  if (rotulo.includes(termo)) return 2;
  const tudo = [tela.label, tela.ajuda, ...(APELIDOS[tela.href] ?? [])].join(" ");
  return combinaBusca(tudo, busca) ? 1 : 0;
}

/** As telas que combinam com o que foi digitado, mais parecida primeiro. */
export function filtrarTelas(telas: Tela[], busca: string): Tela[] {
  if (normalizar(busca) === "") return telas;
  return telas
    .map((tela) => ({ tela, peso: peso(tela, busca) }))
    .filter((r) => r.peso > 0)
    .sort(
      (a, b) => b.peso - a.peso || compararNomes(a.tela.label, b.tela.label)
    )
    .map((r) => r.tela);
}
