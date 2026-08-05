// Teste de INTEGRAÇÃO do ciclo de vida do contrato, contra um SQLite real
// criado do zero pelas migrations:
//   orçamento aprovado → rascunho → emitido → nova versão → assinado → aditivo
//
// Roda fora do Next (as server actions dependem de request/sessão), replicando
// as MESMAS regras de `src/lib/contratos.ts` sobre o banco. Serve para provar
// que o schema, as transições e a numeração funcionam juntos.
//
// Uso: node scripts/teste-ciclo-contrato.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import Database from "better-sqlite3";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "toldos-ciclo-"));
const dbPath = path.join(dir, "teste.db");

let sqlite;
try {
  sqlite = new Database(dbPath);
} catch (e) {
  // better-sqlite3 é binário nativo compilado para o Node do projeto (20, o
  // mesmo do Dockerfile). Em outra major o require falha com ERR_DLOPEN_FAILED.
  if (String(e.message).includes("NODE_MODULE_VERSION")) {
    console.error(
      `\n⚠️  Este teste precisa do Node 20 (o mesmo do Dockerfile).\n` +
        `   Você está no ${process.version}. Rode com:\n` +
        `   nvm use 20 && npm run test:ciclo\n`
    );
    process.exit(1);
  }
  throw e;
}
sqlite.pragma("foreign_keys = ON");

let passos = 0;
const passo = (nome, fn) => {
  fn();
  passos++;
  console.log(`  ✔ ${nome}`);
};

try {
  // --- migrations reais, na ordem do journal ---
  const journal = JSON.parse(
    fs.readFileSync(path.join("drizzle", "meta", "_journal.json"), "utf8")
  );
  for (const entrada of journal.entries) {
    const sql = fs.readFileSync(
      path.join("drizzle", `${entrada.tag}.sql`),
      "utf8"
    );
    for (const stmt of sql.split("--> statement-breakpoint")) {
      const limpo = stmt.trim();
      if (limpo) sqlite.exec(limpo);
    }
  }
  console.log(`Migrations aplicadas (${journal.entries.length})`);

  // --- massa de teste: cliente + fase + atendimento + orçamento aprovado ---
  const ano = new Date().getFullYear();
  sqlite
    .prepare(
      `INSERT INTO clientes (id, nome, telefone, email, endereco, numero, bairro, cidade, cep, documento)
       VALUES (1, 'Maria Silva', '(31)99999-0000', 'maria@exemplo.com', 'Rua A', '10', 'Buritis', 'Belo Horizonte/MG', '30575-100', '123.456.789-00')`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO fases (id, nome, ordem, cor, libera_instalacao) VALUES (1, 'Orçamento aprovado', 5, '#16A34A', 1)`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO atendimentos (id, cliente_id, fase_id) VALUES (1, 1, 1)`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO orcamentos (id, numero, atendimento_id, status) VALUES (1, '${ano}-001', 1, 'aprovado')`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO orcamento_itens (orcamento_id, descricao, valor_min, ordem)
       VALUES (1, 'Toldo Retrátil Cortina 3,00 × 2,50', 399000, 0)`
    )
    .run();

  const VALOR = 399000; // R$ 3.990,00

  // ---------------------------------------------------------------- rascunho
  let idAtual;
  passo("orçamento aprovado → contrato em rascunho", () => {
    const info = sqlite
      .prepare(
        `INSERT INTO contratos (cliente_id, orcamento_id, status, valor_total, local_instalacao, public_token, criado_por)
         VALUES (1, 1, 'rascunho', ?, 'Área da piscina', ?, 'teste')`
      )
      .run(VALOR, crypto.randomBytes(9).toString("base64url"));
    idAtual = Number(info.lastInsertRowid);
    sqlite
      .prepare(
        `INSERT INTO contrato_itens (contrato_id, ordem, modelo, cor, medidas_m2)
         VALUES (?, 0, 'Toldo Retrátil Cortina', 'bege', '3,00 × 2,50 m')`
      )
      .run(idAtual);
    sqlite
      .prepare(
        `INSERT INTO contrato_pagamentos (contrato_id, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho)
         VALUES (?, 0, 'Sinal/entrada', 'sinal', ?, 'pix', 1, 'assinatura')`
      )
      .run(idAtual, VALOR / 2);
    sqlite
      .prepare(
        `INSERT INTO contrato_pagamentos (contrato_id, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho)
         VALUES (?, 1, 'Saldo', 'saldo', ?, 'cartao_credito', 6, 'conclusao_instalacao')`
      )
      .run(idAtual, VALOR / 2);
    sqlite
      .prepare(
        `INSERT INTO contrato_eventos (contrato_id, tipo, descricao, usuario) VALUES (?, 'criado', 'Contrato criado', 'teste')`
      )
      .run(idAtual);

    const c = sqlite.prepare("SELECT * FROM contratos WHERE id = ?").get(idAtual);
    assert.equal(c.status, "rascunho");
    assert.equal(c.numero, null, "rascunho não pode ter número");
    assert.equal(c.versao, 1);
  });

  passo("soma do plano bate com o valor total", () => {
    const soma = sqlite
      .prepare(
        "SELECT COALESCE(SUM(valor),0) AS s FROM contrato_pagamentos WHERE contrato_id = ?"
      )
      .get(idAtual).s;
    assert.equal(soma, VALOR);
  });

  // ----------------------------------------------------------------- emitido
  passo("rascunho → emitido (ganha número CT-AAAA-0001 e snapshot)", () => {
    const numero = `CT-${ano}-0001`;
    const snapshot = JSON.stringify({
      cliente: { nome: "Maria Silva", documento: "123.456.789-00" },
      orcamento: { numero: `${ano}-001`, status: "aprovado", valorTotal: VALOR },
    });
    sqlite
      .prepare(
        `UPDATE contratos SET numero = ?, status = 'emitido', data_emissao = unixepoch(), snapshot = ? WHERE id = ?`
      )
      .run(numero, snapshot, idAtual);
    sqlite
      .prepare(
        `INSERT INTO contrato_eventos (contrato_id, tipo, descricao, usuario) VALUES (?, 'emitido', ?, 'teste')`
      )
      .run(idAtual, `Contrato emitido sob o nº ${numero}`);

    const c = sqlite.prepare("SELECT * FROM contratos WHERE id = ?").get(idAtual);
    assert.equal(c.status, "emitido");
    assert.equal(c.numero, `CT-${ano}-0001`);
    assert.ok(c.snapshot, "snapshot deve estar congelado");
  });

  // ------------------------------------------------------------ nova versão
  let idV2;
  passo("emitido → nova versão (v2 rascunho; v1 cancelada)", () => {
    const antigo = sqlite
      .prepare("SELECT * FROM contratos WHERE id = ?")
      .get(idAtual);
    const info = sqlite
      .prepare(
        `INSERT INTO contratos (versao, contrato_pai_id, cliente_id, orcamento_id, status, valor_total, local_instalacao, public_token, criado_por)
         VALUES (?, ?, ?, ?, 'rascunho', ?, ?, ?, 'teste')`
      )
      .run(
        antigo.versao + 1,
        antigo.id,
        antigo.cliente_id,
        antigo.orcamento_id,
        antigo.valor_total,
        antigo.local_instalacao,
        crypto.randomBytes(9).toString("base64url")
      );
    idV2 = Number(info.lastInsertRowid);
    // clona itens e pagamentos
    sqlite
      .prepare(
        `INSERT INTO contrato_itens (contrato_id, ordem, modelo, cor, medidas_m2, descricao_extra)
         SELECT ?, ordem, modelo, cor, medidas_m2, descricao_extra FROM contrato_itens WHERE contrato_id = ?`
      )
      .run(idV2, idAtual);
    sqlite
      .prepare(
        `INSERT INTO contrato_pagamentos (contrato_id, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho, dias_apos, data_vencimento)
         SELECT ?, ordem, rotulo, tipo, valor, meio, numero_parcelas, gatilho, dias_apos, data_vencimento FROM contrato_pagamentos WHERE contrato_id = ?`
      )
      .run(idV2, idAtual);
    sqlite
      .prepare(
        `UPDATE contratos SET status = 'cancelado', motivo_cancelamento = ? WHERE id = ?`
      )
      .run("Substituído pela versão 2", idAtual);

    const v1 = sqlite.prepare("SELECT * FROM contratos WHERE id = ?").get(idAtual);
    const v2 = sqlite.prepare("SELECT * FROM contratos WHERE id = ?").get(idV2);
    assert.equal(v1.status, "cancelado");
    assert.match(v1.motivo_cancelamento, /versão 2/);
    assert.equal(v2.versao, 2);
    assert.equal(v2.contrato_pai_id, idAtual);
    assert.equal(v2.status, "rascunho");
    assert.equal(
      sqlite
        .prepare("SELECT count(*) AS c FROM contrato_pagamentos WHERE contrato_id = ?")
        .get(idV2).c,
      2,
      "plano de pagamento deve ter sido clonado"
    );
  });

  passo("v2 emitida recebe o número seguinte (CT-AAAA-0002)", () => {
    const numeros = sqlite
      .prepare("SELECT numero FROM contratos WHERE numero LIKE ?")
      .all(`CT-${ano}-%`)
      .map((r) => r.numero);
    const maior = numeros.reduce((max, n) => {
      const seq = parseInt(String(n).slice(`CT-${ano}-`.length), 10);
      return Number.isFinite(seq) ? Math.max(max, seq) : max;
    }, 0);
    const proximo = `CT-${ano}-${String(maior + 1).padStart(4, "0")}`;
    assert.equal(proximo, `CT-${ano}-0002`);
    sqlite
      .prepare(
        "UPDATE contratos SET numero = ?, status = 'emitido', data_emissao = unixepoch() WHERE id = ?"
      )
      .run(proximo, idV2);
  });

  // ---------------------------------------------------------------- assinado
  passo("emitido → assinado (registra data)", () => {
    sqlite
      .prepare(
        "UPDATE contratos SET status = 'assinado', data_assinatura = unixepoch() WHERE id = ?"
      )
      .run(idV2);
    sqlite
      .prepare(
        `INSERT INTO contrato_eventos (contrato_id, tipo, descricao, usuario) VALUES (?, 'assinado', 'Assinatura registrada', 'teste')`
      )
      .run(idV2);
    const c = sqlite.prepare("SELECT * FROM contratos WHERE id = ?").get(idV2);
    assert.equal(c.status, "assinado");
    assert.ok(c.data_assinatura, "data de assinatura deve estar preenchida");
  });

  // ----------------------------------------------------------------- aditivo
  passo("assinado → aditivo nº 1 (soma valor e vira aditivado)", () => {
    const antes = sqlite.prepare("SELECT * FROM contratos WHERE id = ?").get(idV2);
    const delta = 50000; // +R$ 500,00
    const numerosAditivo = sqlite
      .prepare("SELECT numero FROM contrato_aditivos WHERE contrato_id = ?")
      .all(idV2)
      .map((r) => r.numero);
    const numero = numerosAditivo.reduce((m, n) => Math.max(m, n), 0) + 1;
    assert.equal(numero, 1);

    sqlite
      .prepare(
        `INSERT INTO contrato_aditivos (contrato_id, numero, objeto, delta_valor, novo_prazo_dias_uteis, data_assinatura)
         VALUES (?, ?, 'Acréscimo de 1 toldo na área de serviço', ?, 45, unixepoch())`
      )
      .run(idV2, numero, delta);
    sqlite
      .prepare(
        "UPDATE contratos SET status = 'aditivado', valor_total = valor_total + ?, prazo_dias_uteis = 45 WHERE id = ?"
      )
      .run(delta, idV2);

    const depois = sqlite.prepare("SELECT * FROM contratos WHERE id = ?").get(idV2);
    assert.equal(depois.status, "aditivado");
    assert.equal(depois.valor_total, antes.valor_total + delta);
    assert.equal(depois.prazo_dias_uteis, 45);
  });

  passo("aditivos são cumulativos e numerados", () => {
    const numeros = sqlite
      .prepare("SELECT numero FROM contrato_aditivos WHERE contrato_id = ?")
      .all(idV2)
      .map((r) => r.numero);
    const proximo = numeros.reduce((m, n) => Math.max(m, n), 0) + 1;
    sqlite
      .prepare(
        `INSERT INTO contrato_aditivos (contrato_id, numero, objeto, delta_valor)
         VALUES (?, ?, 'Troca de cor da lona', 0)`
      )
      .run(idV2, proximo);
    const todos = sqlite
      .prepare("SELECT numero FROM contrato_aditivos WHERE contrato_id = ? ORDER BY numero")
      .all(idV2)
      .map((r) => r.numero);
    assert.deepEqual(todos, [1, 2]);
  });

  passo("auditoria registrou toda a trajetória", () => {
    const tipos = sqlite
      .prepare(
        "SELECT tipo FROM contrato_eventos WHERE contrato_id IN (?, ?) ORDER BY id"
      )
      .all(idAtual, idV2)
      .map((r) => r.tipo);
    assert.ok(tipos.includes("criado"));
    assert.ok(tipos.includes("emitido"));
    assert.ok(tipos.includes("assinado"));
  });

  passo("cascade: excluir contrato leva itens, pagamentos e eventos junto", () => {
    const antes = sqlite
      .prepare("SELECT count(*) AS c FROM contrato_pagamentos WHERE contrato_id = ?")
      .get(idAtual).c;
    assert.ok(antes > 0);
    sqlite.prepare("DELETE FROM contratos WHERE id = ?").run(idAtual);
    const depois = sqlite
      .prepare("SELECT count(*) AS c FROM contrato_pagamentos WHERE contrato_id = ?")
      .get(idAtual).c;
    assert.equal(depois, 0);
  });

  console.log(`\n✅ ciclo completo do contrato: ${passos} passos OK`);
} catch (erro) {
  console.error("\n❌ falhou:", erro.message);
  process.exitCode = 1;
} finally {
  sqlite.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
