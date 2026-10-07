// As migrations são escritas À MÃO (os snapshots do drizzle-kit pararam na
// 0004). O Drizzle só aplica migration cujo `when` seja MAIOR que o da
// última aplicada — uma data menor é pulada EM SILÊNCIO em produção. Este
// teste trava os erros fáceis de cometer à mão (auditoria de 07/10/2026).
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const dir = "drizzle";
const journal = JSON.parse(fs.readFileSync(path.join(dir, "meta", "_journal.json"), "utf8"));
const arquivos = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

journal.entries.forEach((e, i) => {
  assert.equal(e.idx, i, `idx fora de sequência na entrada ${e.tag}`);
  assert.ok(fs.existsSync(path.join(dir, `${e.tag}.sql`)), `${e.tag}.sql não existe`);
  if (i > 0) {
    const ant = journal.entries[i - 1];
    assert.ok(
      e.when > ant.when,
      `${e.tag}: "when" (${e.when}) não é maior que o de ${ant.tag} (${ant.when}) — o Drizzle pularia esta migration em silêncio. Use Date.now().`
    );
  }
});
const noJournal = new Set(journal.entries.map((e) => `${e.tag}.sql`));
const soltos = arquivos.filter((f) => !noJournal.has(f));
assert.deepEqual(soltos, [], `migration fora do _journal.json: ${soltos.join(", ")}`);

console.log(`✅ migrations: ${journal.entries.length} no journal, em ordem, sem arquivo solto`);
