import { test } from "node:test";
import assert from "node:assert/strict";
import {
  avaliarGarantia,
  descricaoServico,
  linhasDaFicha,
  SUFIXO_CONTINUA,
  vendedorVeChamado,
} from "./chamados";

const HOJE = new Date(2026, 7, 27); // 27/08/2026

test("sem data de entrega a garantia é indefinida, não expirada", () => {
  const r = avaliarGarantia(null, 12, HOJE);
  assert.equal(r.status, "indefinida");
  assert.equal(r.dias, null);
  assert.match(r.texto, /ficha de instalação/);
});

test("dentro do prazo conta os dias que faltam", () => {
  // Entregue em 01/08/2026, garantia de 12 meses → vence 01/08/2027.
  const r = avaliarGarantia(new Date(2026, 7, 1), 12, HOJE);
  assert.equal(r.status, "dentro");
  assert.equal(r.dias, 339);
});

test("fora do prazo conta os dias passados", () => {
  // Entregue em 01/08/2025, garantia de 12 meses → venceu 01/08/2026.
  const r = avaliarGarantia(new Date(2025, 7, 1), 12, HOJE);
  assert.equal(r.status, "fora");
  assert.equal(r.dias, 26);
  assert.match(r.texto, /Fora da garantia/);
});

// A diferença entre a empresa pagar a visita e cobrar do cliente é um dia.
test("o último dia ainda está na garantia", () => {
  const r = avaliarGarantia(new Date(2025, 7, 27), 12, HOJE);
  assert.equal(r.status, "dentro");
  assert.equal(r.dias, 0);
  assert.match(r.texto, /Último dia/);
});

test("o dia seguinte ao vencimento já está fora", () => {
  const r = avaliarGarantia(new Date(2025, 7, 26), 12, HOJE);
  assert.equal(r.status, "fora");
  assert.equal(r.dias, 1);
});

test("prazo diferente do padrão é respeitado", () => {
  // 6 meses a partir de 01/08/2026 → vence 01/02/2027, ainda dentro.
  assert.equal(avaliarGarantia(new Date(2026, 7, 1), 6, HOJE).status, "dentro");
  // 3 meses a partir de 01/01/2026 → venceu 01/04/2026.
  assert.equal(avaliarGarantia(new Date(2026, 0, 1), 3, HOJE).status, "fora");
});

test("hora do dia não muda o resultado", () => {
  const manha = avaliarGarantia(new Date(2025, 7, 27, 8), 12, HOJE);
  const noite = avaliarGarantia(new Date(2025, 7, 27, 23), 12, HOJE);
  assert.equal(manha.dias, noite.dias);
});

// --- Ordem de manutenção -----------------------------------------------------

test("vedação vale pelo rótulo, mesmo com texto solto sobrando", () => {
  assert.equal(descricaoServico("vedacao", "ignorar isto"), "Vedação");
});

test('"outros" imprime a descrição, não a palavra "Outros"', () => {
  assert.equal(descricaoServico("outros", " troca do motor "), "troca do motor");
});

test('"outros" sem descrição ainda imprime alguma coisa', () => {
  assert.equal(descricaoServico("outros", null), "Outros");
});

test("serviço não escolhido não inventa rótulo", () => {
  assert.equal(descricaoServico(null, null), "");
  assert.equal(descricaoServico(undefined, "  "), "");
});

test("a ficha sempre sai com o mesmo número de linhas", () => {
  assert.equal(linhasDaFicha(null).length, 4);
  assert.equal(linhasDaFicha("uma linha só").length, 4);
  assert.deepEqual(linhasDaFicha("curto", 3), ["curto", "", ""]);
});

test("o relato quebra por palavra, sem cortar no meio", () => {
  const linhas = linhasDaFicha("aaa bbb ccc ddd", 3, 7);
  assert.deepEqual(linhas, ["aaa bbb", "ccc ddd", ""]);
});

test("palavra maior que a linha é cortada em vez de estourar a margem", () => {
  const linhas = linhasDaFicha("abcdefghij", 3, 4);
  assert.deepEqual(linhas, ["abcd", "efgh", "ij"]);
});

test("relato longo demais é cortado no total de linhas da ficha, com aviso", () => {
  // Linha curta demais para "(continua no sistema)": só as reticências.
  const linhas = linhasDaFicha("aaa bbb ccc ddd eee fff", 2, 7);
  assert.equal(linhas.length, 2);
  assert.deepEqual(linhas, ["aaa bbb", "ccc…"]);
});

test("relato que não cabe avisa que continua no sistema (auditoria de 07/10/2026)", () => {
  const relato = Array.from({ length: 60 }, (_, i) => `palavra${i}`).join(" ");
  const linhas = linhasDaFicha(relato);
  assert.equal(linhas.length, 4);
  assert.ok(linhas[3].endsWith(SUFIXO_CONTINUA));
  for (const l of linhas) assert.ok(l.length <= 95, `linha com ${l.length}`);
  // A última linha corta em fim de palavra, não no meio dela.
  assert.match(linhas[3], /^palavra\d+( palavra\d+)*… \(continua no sistema\)$/);
});

test("relato que cabe exatamente não ganha aviso", () => {
  assert.deepEqual(linhasDaFicha("aaa bbb ccc ddd", 2, 7), ["aaa bbb", "ccc ddd"]);
  assert.ok(!linhasDaFicha("goteira na calha").some((l) => l.includes("continua")));
});

test("palavra gigante na última linha também cede espaço ao aviso", () => {
  const linhas = linhasDaFicha("x".repeat(500), 2, 40);
  assert.equal(linhas[0], "x".repeat(40));
  assert.equal(linhas[1], `${"x".repeat(40 - SUFIXO_CONTINUA.length)}${SUFIXO_CONTINUA}`);
});

test("quebra de linha e espaço repetido viram um espaço só", () => {
  assert.deepEqual(linhasDaFicha("goteira\n\n  na   emenda", 1), [
    "goteira na emenda",
  ]);
});

test("vendedor vê o chamado dele, o sem dono e o do cliente dele — e só", () => {
  const joao = 2;
  const outro = 3;
  // responsável é ele
  assert.ok(vendedorVeChamado({ responsavelId: joao, vendedorDoAtendimentoId: outro }, joao));
  // ninguém pegou ainda: fica visível, senão vira órfão
  assert.ok(vendedorVeChamado({ responsavelId: null, vendedorDoAtendimentoId: outro }, joao));
  // o cliente é dele, mesmo com outra pessoa cuidando
  assert.ok(vendedorVeChamado({ responsavelId: outro, vendedorDoAtendimentoId: joao }, joao));
  // de outro vendedor, cliente de outro vendedor: não vê
  assert.ok(!vendedorVeChamado({ responsavelId: outro, vendedorDoAtendimentoId: outro }, joao));
  // usuário sem cadastro de vendedor não passa por esta regra
  assert.ok(!vendedorVeChamado({ responsavelId: null, vendedorDoAtendimentoId: null }, null));
});
