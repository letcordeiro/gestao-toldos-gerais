// Dados FICTÍCIOS da demonstração (demo-toldos.cordena.net).
//
// Roda no boot só com DEMO=1, num banco que o init-db acabou de zerar: a
// demonstração recomeça limpa a cada deploy, e as datas (visitas da semana,
// prazos, instalação) contam a partir do dia em que subiu.
//
// Nenhum nome, telefone ou endereço daqui é de cliente de verdade. Os
// telefones usam o prefixo 99999 de propósito, para ninguém mandar WhatsApp
// para um número real ao testar.

export const CONTAS_DEMO = [
  { papel: "gestor", email: "gestora@demo.toldos", nome: "Marina Duarte", whatsapp: "(31) 99999-0001" },
  { papel: "atendente", email: "atendente@demo.toldos", nome: "Ana Lúcia Prado", whatsapp: "(31) 99999-0002" },
  { papel: "vendedor", email: "vendedor@demo.toldos", nome: "Carlos Menezes", whatsapp: "(31) 99999-0003" },
  { papel: "vendedor", email: "beatriz@demo.toldos", nome: "Beatriz Fontes", whatsapp: "(31) 99999-0004" },
];

// [nome, bairro, rua, número, fase, vendedor (índice em CONTAS_DEMO)]
const CLIENTES = [
  ["Restaurante Sabor da Serra", "Savassi", "Rua Antônio de Albuquerque", "310", "Instalação agendada", 2],
  ["Cláudia Ribeiro Matos", "Buritis", "Rua Engenheiro Alberto Pontes", "88", "Em produção", 3],
  ["Escola Pequeno Saber", "Santa Efigênia", "Rua Ceará", "1450", "Concluído", 2],
  ["Ricardo Almeida Souza", "Pampulha", "Avenida Otacílio Negrão de Lima", "2200", "Negociação", 2],
  ["Padaria Pão Dourado", "Floresta", "Rua Pouso Alegre", "512", "Orçamento enviado", 3],
  ["Fernanda Costa Lima", "Castelo", "Rua Romualdo Lopes Cançado", "75", "Orçamento enviado", 2],
  ["Clínica Bem Viver", "Funcionários", "Rua Aimorés", "1890", "Visita técnica", 3],
  ["Marcos Vinícius Rocha", "Sion", "Rua Cristina", "640", "Visita técnica", 2],
  ["Juliana Teixeira Braga", "Prado", "Rua Platina", "1023", "Novo lead", 2],
  ["Bar do Toninho", "Santa Tereza", "Rua Mármore", "260", "Novo lead", 3],
  ["Patrícia Mendes Faria", "Ouro Preto", "Rua Conceição do Mato Dentro", "155", "Perdido", 3],
  ["Condomínio Jardim das Acácias", "Belvedere", "Rua Jornalista Djalma Andrade", "1400", "Aguardando pagamento", 2],
];

// [descrição, valor em reais] — itens típicos de proposta.
const ITENS = [
  [["Toldo retrátil 4,00 x 2,50 m, lona blackout, acionamento motorizado", 9800], ["Instalação e vedação", 1200]],
  [["Cobertura de policarbonato alveolar 6 mm, 5,00 x 3,00 m, estrutura em alumínio", 14500]],
  [["Toldo cortina 3,00 x 2,20 m, lona vinílica", 4300], ["Troca de lona do toldo existente", 1850]],
  [["Cobertura termoacústica (telha sanduíche) 40 m²", 23800], ["Calha e rufos", 2600]],
  [["Sombreador tensionado em membrana, 3 velas", 7200]],
];

const MODELO_POR_ITEM = [
  "Toldo Retrátil Cortina",
  "Cobertura de Policarbonato e Vidro",
  "Toldos em Lona",
  "Cobertura Termoacústica (telha sanduíche)",
  "Sombreadores",
];

const DIA = 86400;

export function semearDemo(sqlite) {
  const agora = Math.floor(Date.now() / 1000);
  const hoje = new Date();
  // Data sem hora (prazo, previsão): meia-noite UTC do dia — a regra da casa.
  const diaUTC = (somar) =>
    Math.floor(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + somar) / 1000);
  // Horário de visita: relógio do servidor, o mesmo de `paraData`.
  const horario = (somar, h, min = 0) =>
    Math.floor(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + somar, h, min).getTime() / 1000);
  const ano = hoje.getFullYear();

  const fase = Object.fromEntries(
    sqlite.prepare("SELECT id, nome FROM fases").all().map((f) => [f.nome, f.id])
  );
  const modelo = Object.fromEntries(
    sqlite.prepare("SELECT id, nome FROM modelos_toldo").all().map((m) => [m.nome, m.id])
  );
  const canal = sqlite.prepare("SELECT id FROM canais ORDER BY ordem LIMIT 1").get()?.id ?? null;
  const motivoPerda = sqlite.prepare("SELECT id FROM motivos_perda ORDER BY ordem LIMIT 1").get()?.id ?? null;

  const insVendedor = sqlite.prepare(
    "INSERT INTO vendedores (nome, telefone, whatsapp, email, papel, ativo) VALUES (?, ?, ?, ?, ?, 1)"
  );
  const insCliente = sqlite.prepare(
    `INSERT INTO clientes (nome, telefone, email, endereco, numero, bairro, cidade, cep, origem, documento, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, 'Belo Horizonte', '30000-000', 'interno', ?, ?)`
  );
  const insAtendimento = sqlite.prepare(
    `INSERT INTO atendimentos (cliente_id, fase_id, vendedor_id, canal_id, observacoes, motivo_perda_id, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insHistorico = sqlite.prepare(
    "INSERT INTO historico_fases (atendimento_id, fase_anterior_id, fase_nova_id, data) VALUES (?, ?, ?, ?)"
  );
  const insOrcamento = sqlite.prepare(
    `INSERT INTO orcamentos (numero, atendimento_id, modelo_id, vendedor_id, status, tipo_estrutura,
       forma_pagamento, prazo_entrega, validade_dias, criado_em, enviado_em)
     VALUES (?, ?, ?, ?, ?, 'aluminio', '50% de entrada e saldo na instalação', '20 dias úteis', 15, ?, ?)`
  );
  const insItem = sqlite.prepare(
    "INSERT INTO orcamento_itens (orcamento_id, descricao, valor_min, ordem) VALUES (?, ?, ?, ?)"
  );
  const insVisita = sqlite.prepare(
    `INSERT INTO visitas (atendimento_id, vendedor_id, inicio_em, duracao_min, endereco, observacoes, situacao, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Demonstração')`
  );
  const insBloqueio = sqlite.prepare(
    `INSERT INTO agenda_bloqueios (vendedor_id, recorrencia, data, dia_semana, inicio_min, fim_min, ate, motivo, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'Demonstração')`
  );
  const insTarefa = sqlite.prepare(
    `INSERT INTO tarefas (tipo, titulo, atendimento_id, responsavel_id, prioridade, status, prevista_em, criado_por)
     VALUES (?, ?, ?, ?, ?, 'pendente', ?, 'Demonstração')`
  );
  const insChamado = sqlite.prepare(
    `INSERT INTO chamados (atendimento_id, orcamento_id, assunto, descricao, tipo, na_garantia, prioridade, situacao,
       responsavel_id, natureza, tipo_servico, visita_em, instalador, criado_por, criado_em)
     VALUES (?, ?, ?, ?, 'receptivo', ?, ?, 'aberto', ?, ?, ?, ?, ?, 'Demonstração', ?)`
  );
  const insFicha = sqlite.prepare(
    `INSERT INTO orcamento_instalacao (orcamento_id, responsavel, horario, prev_entrega, data_entrega, observacoes)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const ids = { vendedores: [], atendimentos: {}, orcamentos: {} };

  sqlite.transaction(() => {
    for (const c of CONTAS_DEMO) {
      ids.vendedores.push(
        insVendedor.run(c.nome, c.whatsapp, c.whatsapp, c.email, c.papel).lastInsertRowid
      );
    }

    // Fases depois de "Orçamento enviado" ganham orçamento; as fechadas, aprovado.
    const fechadas = ["Aguardando pagamento", "Em produção", "Instalação agendada", "Concluído"];
    const comOrcamento = ["Orçamento enviado", "Negociação", ...fechadas, "Perdido"];
    let seq = 0;

    CLIENTES.forEach(([nome, bairro, rua, numero, nomeFase, iv], i) => {
      const criado = agora - (40 - i * 3) * DIA;
      const tel = `(31) 99999-${String(1100 + i * 7).padStart(4, "0")}`;
      const email = `${nome.split(" ")[0].toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}${i}@exemplo.com`;
      const doc = i % 3 === 0 ? `12.345.678/0001-${String(10 + i).padStart(2, "0")}` : null;
      const clienteId = insCliente.run(nome, tel, email, rua, numero, bairro, doc, criado).lastInsertRowid;

      const faseId = fase[nomeFase] ?? fase["Novo lead"];
      const vendedorId = ids.vendedores[iv];
      const atId = insAtendimento.run(
        clienteId,
        faseId,
        vendedorId,
        canal,
        nomeFase === "Novo lead" ? "Pediu orçamento pelo Instagram." : null,
        nomeFase === "Perdido" ? motivoPerda : null,
        criado,
        agora - i * DIA
      ).lastInsertRowid;
      ids.atendimentos[nome] = atId;
      insHistorico.run(atId, null, fase["Novo lead"], criado);
      if (nomeFase !== "Novo lead") insHistorico.run(atId, fase["Novo lead"], faseId, criado + 5 * DIA);

      if (comOrcamento.includes(nomeFase)) {
        seq++;
        const status = fechadas.includes(nomeFase)
          ? "aprovado"
          : nomeFase === "Perdido"
            ? "recusado"
            : "enviado";
        const k = i % ITENS.length;
        const orcId = insOrcamento.run(
          `${ano}-${String(seq).padStart(3, "0")}`,
          atId,
          modelo[MODELO_POR_ITEM[k]] ?? null,
          vendedorId,
          status,
          criado + 6 * DIA,
          criado + 6 * DIA
        ).lastInsertRowid;
        ITENS[k].forEach(([d, reais], ordem) => insItem.run(orcId, d, reais * 100, ordem));
        ids.orcamentos[nome] = orcId;
      }
    });

    const [, , carlos, beatriz] = ids.vendedores;
    const at = ids.atendimentos;

    // Visitas: hoje, amanhã e o resto da semana, para a agenda não abrir vazia.
    const v = [
      [at["Clínica Bem Viver"], beatriz, horario(0, 10), 60, "Rua Aimorés, 1890 - Funcionários", "Falar com a Dra. Helena, recepção.", "confirmada"],
      [at["Marcos Vinícius Rocha"], carlos, horario(0, 14, 30), 90, "Rua Cristina, 640 - Sion", "Medir a varanda do 3º andar.", "agendada"],
      [at["Juliana Teixeira Braga"], carlos, horario(1, 9), 60, "Rua Platina, 1023 - Prado", null, "agendada"],
      [at["Bar do Toninho"], beatriz, horario(2, 15), 60, "Rua Mármore, 260 - Santa Tereza", "Levar mostruário de lonas.", "agendada"],
      [at["Ricardo Almeida Souza"], carlos, horario(3, 11), 60, "Av. Otacílio Negrão de Lima, 2200 - Pampulha", "Conferir medida final antes do contrato.", "agendada"],
      [at["Fernanda Costa Lima"], carlos, horario(-2, 16), 60, "Rua Romualdo Lopes Cançado, 75 - Castelo", null, "realizada"],
    ];
    for (const linha of v) insVisita.run(...linha);

    // Bloqueios: a faculdade do Carlos (toda terça e quinta à noite) e um
    // dia de folga da Beatriz.
    const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    insBloqueio.run(carlos, "semanal", dataHoje, 2, 19 * 60, 22 * 60, "Faculdade");
    insBloqueio.run(carlos, "semanal", dataHoje, 4, 19 * 60, 22 * 60, "Faculdade");
    const folga = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 4);
    insBloqueio.run(
      beatriz,
      "unico",
      `${folga.getFullYear()}-${String(folga.getMonth() + 1).padStart(2, "0")}-${String(folga.getDate()).padStart(2, "0")}`,
      null,
      0,
      24 * 60,
      "Folga"
    );

    // Tarefas: uma atrasada, duas para hoje, uma para depois.
    insTarefa.run("ligacao", "Cobrar retorno do orçamento", at["Padaria Pão Dourado"], beatriz, "alta", diaUTC(-2));
    insTarefa.run("whatsapp", "Mandar fotos da obra parecida", at["Ricardo Almeida Souza"], carlos, "media", diaUTC(0));
    insTarefa.run("ligacao", "Confirmar entrada do pagamento", at["Condomínio Jardim das Acácias"], carlos, "alta", diaUTC(0));
    insTarefa.run("visita", "Combinar dia e hora da visita", at["Juliana Teixeira Braga"], carlos, "media", diaUTC(3));

    // Instalação: uma marcada para daqui a 3 dias, outra já entregue.
    insFicha.run(ids.orcamentos["Restaurante Sabor da Serra"], "Equipe do Zé", "8h", diaUTC(3), null, "Acesso pela garagem.");
    insFicha.run(ids.orcamentos["Escola Pequeno Saber"], "Equipe do Zé", "7h", diaUTC(-30), diaUTC(-28), null);
    insFicha.run(ids.orcamentos["Cláudia Ribeiro Matos"], null, null, diaUTC(10), null, null);

    // Chamados de pós-venda: uma visita para avaliar e uma manutenção.
    insChamado.run(
      at["Escola Pequeno Saber"], ids.orcamentos["Escola Pequeno Saber"],
      "Goteira na emenda do toldo", "Pinga água na emenda quando chove forte.",
      1, "alta", carlos, "visita", null, diaUTC(1), null, agora - DIA
    );
    insChamado.run(
      at["Escola Pequeno Saber"], ids.orcamentos["Escola Pequeno Saber"],
      "Troca do motor do toldo da quadra", "Motor parou de responder ao controle.",
      1, "media", carlos, "manutencao", "outros", diaUTC(4), "Zé Instalações", agora - 3 * DIA
    );
  })();

  return { contas: CONTAS_DEMO.length, clientes: CLIENTES.length };
}
