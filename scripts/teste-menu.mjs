// Toda tela do sistema precisa estar no menu — ou ser, de propósito, alcançada
// por botão/redirect. Este teste existe porque duas telas (Cotações e
// Satisfação) sumiram do menu numa edição e ninguém percebeu: a tela continuava
// funcionando, só não havia mais como chegar nela.
import fs from "node:fs";
import path from "node:path";

const base = "src/app/(app)";

// Alcançadas por botão dentro de outra tela, ou redirect de rota antiga.
const FORA_DO_MENU_DE_PROPOSITO = new Set([
  "/cadastros/vendedores", // redirect para /cadastros/usuarios
  "/contratos", // redirect para /orcamentos?contrato=com
  "/cotacoes/nova", // botão em /cotacoes
  "/instalacoes/comissoes", // botão em /instalacoes
  "/orcamentos/novo", // botão em /orcamentos
]);

const rotas = [];
(function anda(dir, url) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) {
      if (e.name === "page.tsx") rotas.push(url || "/");
      continue;
    }
    // Rota de detalhe ([id], [token]) é alcançada por link de listagem.
    if (e.name.startsWith("[")) continue;
    anda(path.join(dir, e.name), `${url}/${e.name}`);
  }
})(base, "");

const layout = fs.readFileSync(path.join(base, "layout.tsx"), "utf8");
const noMenu = new Set(
  [...layout.matchAll(/href: "([^"]+)"/g)].map((m) => m[1])
);

const orfas = rotas.filter(
  (r) => !noMenu.has(r) && !FORA_DO_MENU_DE_PROPOSITO.has(r)
);
const mortos = [...noMenu].filter(
  (h) => h.startsWith("/") && !rotas.includes(h)
);

if (orfas.length > 0) {
  console.error("❌ telas sem caminho no menu:", orfas.join(", "));
}
if (mortos.length > 0) {
  console.error("❌ itens de menu apontando para tela que não existe:", mortos.join(", "));
}
if (orfas.length > 0 || mortos.length > 0) process.exit(1);

console.log(`✅ menu: ${rotas.length} telas, todas alcançáveis`);
