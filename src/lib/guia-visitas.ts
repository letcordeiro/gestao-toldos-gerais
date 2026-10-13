// Guia da tela de Visitas: agenda, visitas, bloqueios e chamados de visita e
// manutenção. Puro — o texto muda com o papel de quem lê, e é isso que o teste
// confere: a atendente não pode ler um passo a passo de um botão que ela não
// tem, e o vendedor não pode ser mandado escolher "Quem vai" num campo que não
// aparece para ele.
//
// `**assim**` vira negrito na tela (guia-da-tela.tsx). Nome de botão vai
// sempre em negrito e escrito IGUAL ao da tela, senão ninguém acha.

import type { Papel } from "./papeis";

export type SecaoGuia = {
  id: string;
  titulo: string;
  resumo: string;
  /** Sequência de verdade — sai numerada. */
  passos?: string[];
  /** Itens soltos, sem ordem. */
  pontos?: string[];
  tabela?: { cabecalho: string[]; linhas: string[][] };
  atencao?: string;
};

export function guiaDeVisitas(papel: Papel): SecaoGuia[] {
  const ehGestor = papel === "gestor";
  const ehAtendente = papel === "atendente";
  const ehVendedor = papel === "vendedor";
  const veTodos = !ehVendedor;

  const secoes: SecaoGuia[] = [
    {
      id: "onde",
      titulo: "Visita, manutenção ou chamado: onde marcar",
      resumo: "São três tipos de ida ao cliente, em dois lugares diferentes.",
      tabela: {
        cabecalho: ["Para quê", "O que usar", "Onde"],
        linhas: [
          [
            "Medir e orçar cliente novo",
            "**Agendar visita**",
            "Aqui em Visitas, ou na tela do cliente",
          ],
          [
            "Avaliar problema em toldo já instalado",
            "Chamado do tipo **Visita**",
            "Mais → Chamados, ou **Abrir chamado** na tela do cliente",
          ],
          [
            "Ir fazer o serviço (vedação, troca de motor…)",
            "Chamado do tipo **Manutenção**",
            "Mais → Chamados, ou **Abrir chamado** na tela do cliente",
          ],
        ],
      },
      atencao:
        "Chamado não aparece nesta agenda: ele guarda só o dia da ida, sem horário, e não ocupa a agenda do vendedor. Acompanhe pela lista de Chamados.",
    },
    {
      id: "semana",
      titulo: "Ler a semana",
      resumo: "A tela abre na semana atual, de segunda a domingo.",
      pontos: [
        "**← Anterior**, **Esta semana** e **Próxima →** trocam de semana. O dia de hoje fica destacado em verde.",
        "Caixa com a borda colorida é **visita**. A cor diz a situação: laranja agendada, azul confirmada, verde realizada, vermelho não compareceu, cinza cancelada.",
        "Caixa listrada é **horário bloqueado**: o vendedor não está disponível.",
        "Clicar na visita abre a janela dela: **Editar / remarcar**, situação, WhatsApp, **Abrir cliente** e apagar.",
        ...(veTodos
          ? [
              "Os nomes acima da grade mostram a agenda de um vendedor só. Em **Todos**, cada caixa diz de quem é.",
            ]
          : ["Você vê a sua agenda: as suas visitas e os seus bloqueios."]),
        "A grade vai das 8h às 18h e cresce sozinha quando há algo antes ou depois.",
        "No celular, a semana vira uma lista por dia; dia sem nada aparece como **Livre**.",
        "**Lista** mostra as próximas visitas dia a dia, com as ações de cada uma. **Anteriores** mostra as que já passaram.",
      ],
    },
    {
      id: "agendar",
      titulo: "Agendar uma visita",
      resumo: "Para medir e orçar. Leva menos de um minuto.",
      passos: [
        "Toque em **Agendar visita**, aqui no alto ou na tela do cliente (lá o cliente já vem escolhido).",
        "Em **Cliente**, digite parte do nome ou do telefone. Só aparecem clientes com atendimento em aberto: se não achar, crie o atendimento antes, em Atendimentos.",
        "Escolha o dia e a hora em **Quando** e ajuste a **Duração** (o padrão é 60 minutos).",
        ...(ehAtendente
          ? [
              "Em **Quem vai**, escolha o vendedor. É obrigatório: a visita entra na agenda dele.",
            ]
          : ehGestor
            ? [
                "Em **Quem vai**, escolha o vendedor, ou deixe **Para mim**.",
              ]
            : []),
        `Olhe **Horários livres no dia** e toque numa faixa: o horário de início é preenchido sozinho. As visitas já marcadas e os horários bloqueados já saíram dali${ehVendedor ? "" : ", e a lista muda conforme o dia, a duração e quem vai"}.`,
        "Confira o **Endereço da visita**. Ele vem do cadastro do cliente; troque se a obra for em outro lugar. É este endereço que entra na rota do dia.",
        "Em **Observações**, anote ponto de referência, com quem falar e o que levar. Toque em **Salvar**.",
      ],
      atencao:
        "Se nenhum horário couber, a janela avisa, mas deixa salvar mesmo assim. Nesse caso, combine com o vendedor antes.",
    },
    {
      id: "depois",
      titulo: "Depois de marcar",
      resumo: "Clique na visita, na semana, ou use os botões da visão **Lista**.",
      pontos: [
        "**Situação**: troque para Confirmada quando o cliente confirmar e para Realizada depois da visita. Não compareceu e Cancelada também ficam ali.",
        "**Editar / remarcar** (o lápis, na Lista): muda dia, horário, duração, endereço ou quem vai. Cliente pediu outro dia? Remarque em vez de apagar e marcar de novo.",
        "**WhatsApp**: abre a conversa com o cliente.",
        "**Lixeira**: apaga a visita, depois de confirmar.",
        "**Abrir rota do dia** (na Lista): abre o Google Maps saindo da loja e passando pelas visitas na ordem dos horários, até 10 paradas.",
        "**choca com a visita anterior**, em vermelho: a visita começa antes da anterior terminar. Remarque uma das duas.",
      ],
    },
  ];

  if (ehAtendente) {
    secoes.push({
      id: "bloqueios",
      titulo: "Horários bloqueados",
      resumo: "Os vendedores bloqueiam o tempo em que não podem atender.",
      pontos: [
        "Na semana, o bloqueio aparece listrado, como **Indisponível**. O motivo é particular do vendedor e não aparece para você.",
        "Na janela de agendar, esses horários já saem dos livres.",
        "Quem bloqueia e desbloqueia é o próprio vendedor ou o gestor. Precisa liberar um horário? Fale com eles.",
      ],
    });
  } else {
    secoes.push({
      id: "bloqueios",
      titulo: "Bloquear horário",
      resumo:
        "Tira da agenda o tempo em que o vendedor não pode atender. Quem marca visita deixa de ver esse horário como livre.",
      passos: [
        "Toque em **Bloquear horário**.",
        ...(ehGestor ? ["Escolha de quem é a agenda."] : []),
        "Escolha **Toda semana** para o que se repete (faculdade, curso) ou **Só um dia** para médico, folga ou viagem.",
        "Toda semana: escolha o dia da semana, **A partir de** e, se tiver fim, **Até** (o fim do semestre, por exemplo). Só um dia: escolha a data.",
        "Marque **Dia inteiro** ou preencha **Das** e **Às**.",
        "Escreva o **Motivo**, se quiser, e salve.",
      ],
      pontos: [
        "Para desfazer, use **Excluir** em **Horários bloqueados**, logo abaixo da semana.",
        ehGestor
          ? "O motivo só aparece para você e para o dono da agenda. A atendente vê **Indisponível**."
          : "O motivo só aparece para você e para o gestor. A atendente vê **Indisponível**.",
        ...(ehVendedor
          ? [
              "Você mexe só na sua agenda. O gestor também pode bloquear e desbloquear horários seus.",
            ]
          : []),
      ],
    });
  }

  secoes.push({
    id: "chamado",
    titulo: "Abrir chamado de visita ou manutenção",
    resumo: "Pós-venda e garantia de quem já tem toldo instalado.",
    passos: [
      "Vá em **Mais → Chamados → Abrir chamado**, ou abra o cliente e toque em **Abrir chamado**.",
      "Em **O que é**, escolha **Visita** (ir avaliar o problema) ou **Manutenção** (ir fazer o serviço).",
      "Preencha o **Assunto** (\"goteira na emenda do toldo\", por exemplo), a **Origem**, a **Prioridade** e a **Garantia**.",
      "Em **Serviço relacionado**, escolha o orçamento da instalação: é dele que sai a data da instalação, que conta o prazo da garantia.",
      ...(veTodos ? ["Escolha o **Responsável**."] : []),
      "Na manutenção, marque o **Serviço** (Vedação ou Outros). Nos dois tipos, preencha a **Data da ida ao local**, o **Instalador** e o **Valor**, se já souber.",
      "Em **O que o cliente relatou**, escreva o problema com as palavras dele e salve.",
      "Na tela do chamado, **Ver ficha** mostra a ordem igual ao papel, e **Imprimir ficha** sai em meia folha A4 para a equipe levar.",
    ],
    atencao:
      "O que o sistema não sabe sai em branco na ficha, para ser escrito no local.",
  });

  secoes.push({
    id: "quem",
    titulo: "Quem pode o quê",
    resumo: "O que cada perfil vê e faz nesta tela.",
    tabela: {
      cabecalho: ["", "Gestor", "Atendente", "Vendedor"],
      linhas: [
        ["Ver a agenda", "De todos", "De todos", "A sua"],
        ["Agendar visita", "Para qualquer vendedor", "Para qualquer vendedor", "Para si"],
        ["Bloquear horário", "De qualquer um", "Não", "O seu"],
        ["Ver o motivo do bloqueio", "Sim", "Não (vê “Indisponível”)", "Só o seu"],
        ["Abrir chamado", "Sim", "Sim", "Dos seus clientes"],
      ],
    },
  });

  return secoes;
}
