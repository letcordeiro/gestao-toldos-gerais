import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrarTelas, TELAS_EXTRAS, type Tela } from "./telas";

const TELAS: Tela[] = [
  { href: "/painel", label: "Painel", ajuda: "Resumo do dia", grupo: "Do dia" },
  {
    href: "/atendimentos",
    label: "Atendimentos",
    ajuda: "Funil de quem procurou a gente",
    grupo: "Do dia",
  },
  {
    href: "/orcamentos",
    label: "Orçamentos",
    ajuda: "Propostas e contratos",
    grupo: "Do dia",
  },
  {
    href: "/visitas",
    label: "Visitas",
    ajuda: "Medição no local",
    grupo: "Do dia",
  },
  {
    href: "/chamados",
    label: "Chamados",
    ajuda: "Pós-venda e garantia depois da instalação",
    grupo: "Telas",
  },
  {
    href: "/cadastros/clientes",
    label: "Clientes",
    ajuda: "Cadastro e histórico de cada um",
    grupo: "Telas",
  },
  {
    href: "/cadastros/motivos-perda",
    label: "Motivos de perda",
    ajuda: "O que responder quando o orçamento cai",
    grupo: "Configurações",
  },
];

const hrefs = (busca: string) => filtrarTelas(TELAS, busca).map((t) => t.href);

test("busca vazia devolve tudo, na ordem do menu", () => {
  assert.deepEqual(
    filtrarTelas(TELAS, "   ").map((t) => t.href),
    TELAS.map((t) => t.href)
  );
});

test("o rótulo ganha da ajuda: 'orc' abre Orçamentos", () => {
  assert.equal(hrefs("orc")[0], "/orcamentos");
  // "Motivos de perda" só entra porque a ajuda dela fala em orçamento.
  assert.ok(hrefs("orc").includes("/cadastros/motivos-perda"));
});

test("acha sem acento e sem cedilha", () => {
  assert.deepEqual(hrefs("orcamentos"), ["/orcamentos"]);
  assert.deepEqual(hrefs("ORÇAMENTOS"), ["/orcamentos"]);
});

test("acha pelo nome que a pessoa usa, não pelo do menu", () => {
  // Garantia é Chamados; agenda é Visitas; contrato mora em Orçamentos.
  assert.deepEqual(hrefs("garantia"), ["/chamados"]);
  assert.deepEqual(hrefs("agenda"), ["/visitas"]);
  assert.ok(hrefs("contrato").includes("/orcamentos"));
});

test("acha pelo meio do nome, não só pelo começo", () => {
  assert.ok(hrefs("perda").includes("/cadastros/motivos-perda"));
});

test("o que não existe não inventa resultado", () => {
  assert.deepEqual(hrefs("xyz"), []);
});

test("toda tela extra tem apelido ou rótulo que a encontre", () => {
  for (const tela of TELAS_EXTRAS) {
    const achou = filtrarTelas([tela], tela.label);
    assert.equal(achou.length, 1, `não acha "${tela.label}" pelo próprio nome`);
  }
});
