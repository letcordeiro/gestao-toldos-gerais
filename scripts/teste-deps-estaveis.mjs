// Prop com valor padrão `= []` ou `= {}` cria um array/objeto NOVO a cada
// render. Se ela entra na lista de dependências de um useEffect/useMemo/
// useCallback, o efeito roda a cada render — e se ele grava estado, o
// componente redesenha para sempre.
//
// Foi o que travou o sistema em 07/10/2026: `orcamentos = []` no
// ChamadoDialog, dependência de um efeito que gravava estado. O loop rodava
// com o diálogo FECHADO (o botão já mantém o componente montado) e o React
// nunca tinha folga para trocar de tela: menu sem resposta até o F5, aviso
// que não sumia. Em produção o React não avisa nada — por isso este teste.
//
// O conserto é uma constante fora do componente:
//   const SEM_ITENS: Item[] = [];   ...   itens = SEM_ITENS,
import fs from "node:fs";
import path from "node:path";

const problemas = [];
(function anda(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { anda(p); continue; }
    if (!/\.tsx?$/.test(e.name)) continue;
    const s = fs.readFileSync(p, "utf8");
    const padroes = new Set(
      [...s.matchAll(/^\s+(\w+)\s*=\s*(?:\[\]|\{\})\s*,/gm)].map((m) => m[1])
    );
    if (padroes.size === 0) continue;
    // Lista de dependências: o `[...]` final de useEffect/useMemo/useCallback/
    // useLayoutEffect, escrito em bloco ("}, [a]") ou numa linha só
    // ("useMemo(() => x, [a, b])").
    const listas = [
      ...s.matchAll(/\},\s*\[([^\]]*)\]\s*\)/g),
      ...s.matchAll(/\buse(?:Effect|Memo|Callback|LayoutEffect)\([^;]*?,\s*\[([^\]]*)\]\s*\)/g),
    ];
    for (const m of listas) {
      const nomes = new Set(m[1].match(/\b\w+\b/g) ?? []);
      for (const n of padroes) {
        if (nomes.has(n)) problemas.push(`${p}: "${n}" tem padrão novo a cada render e é dependência de hook`);
      }
    }
  }
})("src");

if (problemas.length > 0) {
  console.error("❌ dependência instável (loop de render):\n  " + problemas.join("\n  "));
  process.exit(1);
}
console.log("✅ deps: nenhuma prop com [] / {} padrão usada como dependência de hook");
