// Seed de contratos de exemplo — dois estados diferentes (rascunho e assinado).
// Idempotente: só roda quando a tabela está vazia, e só se existir orçamento.
// Usado pelo init-db (boot) e pode ser chamado direto em dev.

import crypto from "node:crypto";

export function semearContratos(sqlite) {
  const jaTem = sqlite.prepare("SELECT count(*) AS c FROM contratos").get().c;
  if (jaTem > 0) return { criados: 0, motivo: "já existem contratos" };

  // Precisa de orçamentos com itens para virar contrato de exemplo.
  const candidatos = sqlite
    .prepare(
      `SELECT o.id AS orcamento_id, o.numero, a.cliente_id,
              COALESCE((SELECT SUM(oi.valor_min) FROM orcamento_itens oi
                         WHERE oi.orcamento_id = o.id), 0) AS total,
              (SELECT m.nome FROM modelos_toldo m WHERE m.id = o.modelo_id) AS modelo
         FROM orcamentos o
         JOIN atendimentos a ON a.id = o.atendimento_id
        WHERE COALESCE((SELECT SUM(oi.valor_min) FROM orcamento_itens oi
                         WHERE oi.orcamento_id = o.id), 0) > 0
        ORDER BY o.id
        LIMIT 2`
    )
    .all();
  if (candidatos.length === 0) {
    return { criados: 0, motivo: "nenhum orçamento com valor" };
  }

  const token = () => crypto.randomBytes(9).toString("base64url");
  const agora = Math.floor(Date.now() / 1000);
  const ano = new Date().getFullYear();

  const inserirContrato = sqlite.prepare(
    `INSERT INTO contratos
       (numero, versao, cliente_id, orcamento_id, status, snapshot, valor_total,
        escopo, local_instalacao, prazo_dias_uteis, garantia_meses,
        retencao_percent, multa_percent, juros_mes_percent, representante,
        cidade_emissao, data_emissao, data_assinatura, public_token, criado_por,
        criado_em, atualizado_em)
     VALUES (?, 1, ?, ?, ?, ?, ?, 'fabricacao', ?, 30, 12, 30, 2, 1,
             'João Pedro Avelar', 'Belo Horizonte', ?, ?, ?, 'seed', ?, ?)`
  );
  const inserirItem = sqlite.prepare(
    `INSERT INTO contrato_itens (contrato_id, ordem, modelo, cor, medidas_m2, descricao_extra)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const inserirPagamento = sqlite.prepare(
    `INSERT INTO contrato_pagamentos
       (contrato_id, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho, dias_apos, data_vencimento)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
  );
  const inserirEvento = sqlite.prepare(
    `INSERT INTO contrato_eventos (contrato_id, tipo, descricao, usuario, criado_em)
     VALUES (?, ?, ?, 'seed', ?)`
  );

  let criados = 0;

  // 1) RASCUNHO — sem número, sai como MINUTA no PDF.
  const a = candidatos[0];
  const enderecoA = sqlite
    .prepare(
      `SELECT COALESCE(endereco, '') || CASE WHEN numero IS NOT NULL THEN ', ' || numero ELSE '' END AS e
         FROM clientes WHERE id = ?`
    )
    .get(a.cliente_id);
  const infoRascunho = inserirContrato.run(
    null,
    a.cliente_id,
    a.orcamento_id,
    "rascunho",
    null,
    a.total,
    enderecoA?.e || "Local a confirmar",
    null,
    null,
    token(),
    agora,
    agora
  );
  const idRascunho = infoRascunho.lastInsertRowid;
  inserirItem.run(idRascunho, 0, a.modelo ?? "Toldo", null, null, null);
  inserirPagamento.run(
    idRascunho,
    0,
    "Sinal/entrada",
    "sinal",
    Math.round(a.total / 2),
    "pix",
    1,
    "assinatura"
  );
  inserirPagamento.run(
    idRascunho,
    1,
    "Saldo",
    "saldo",
    a.total - Math.round(a.total / 2),
    "pix",
    1,
    "conclusao_instalacao"
  );
  inserirEvento.run(
    idRascunho,
    "criado",
    `Contrato criado a partir do orçamento ${a.numero}`,
    agora
  );
  criados++;

  // 2) ASSINADO — com número, snapshot congelado e data de assinatura.
  const b = candidatos[1] ?? candidatos[0];
  if (candidatos[1]) {
    const cliente = sqlite
      .prepare("SELECT * FROM clientes WHERE id = ?")
      .get(b.cliente_id);
    const snapshot = JSON.stringify({
      cliente: {
        nome: cliente.nome,
        documento: cliente.documento,
        endereco: [cliente.endereco, cliente.numero, cliente.bairro, cliente.cidade]
          .filter(Boolean)
          .join(", "),
        telefone: cliente.telefone,
        email: cliente.email,
      },
      orcamento: { numero: b.numero, status: "aprovado", valorTotal: b.total },
    });
    const info = inserirContrato.run(
      `CT-${ano}-0001`,
      b.cliente_id,
      b.orcamento_id,
      "assinado",
      snapshot,
      b.total,
      [cliente.endereco, cliente.numero].filter(Boolean).join(", ") ||
        "Local a confirmar",
      agora - 7 * 86400,
      agora - 3 * 86400,
      token(),
      agora - 7 * 86400,
      agora - 3 * 86400
    );
    const idAssinado = info.lastInsertRowid;
    inserirItem.run(idAssinado, 0, b.modelo ?? "Toldo", "bege", "3,00 × 2,50 m", null);
    inserirPagamento.run(
      idAssinado,
      0,
      "Sinal/entrada",
      "sinal",
      Math.round(b.total * 0.4),
      "pix",
      1,
      "assinatura"
    );
    inserirPagamento.run(
      idAssinado,
      1,
      "Saldo",
      "saldo",
      b.total - Math.round(b.total * 0.4),
      "cartao_credito",
      6,
      "conclusao_instalacao"
    );
    inserirEvento.run(
      idAssinado,
      "criado",
      `Contrato criado a partir do orçamento ${b.numero}`,
      agora - 7 * 86400
    );
    inserirEvento.run(
      idAssinado,
      "emitido",
      `Contrato emitido sob o nº CT-${ano}-0001`,
      agora - 7 * 86400
    );
    inserirEvento.run(
      idAssinado,
      "assinado",
      "Assinatura registrada",
      agora - 3 * 86400
    );
    criados++;
  }

  return { criados, motivo: null };
}
