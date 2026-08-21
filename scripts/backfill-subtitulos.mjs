// Sobe para o topo da lista os subtítulos que são OBSERVAÇÃO GERAL do orçamento,
// para saírem logo abaixo do título "VALOR DO ORÇAMENTO" (pedido da Letícia).
//
// Contexto: antes o botão "+ Subtítulo" só inseria no fim, então observações do
// tipo "orçamento referente à..." acabavam depois dos preços.
//
// Só mexe no que é inequívoco — subtítulo na ÚLTIMA posição cujo texto é de
// observação. NÃO toca em:
//   • subtítulo já no topo (nome do produto: "Telha Sanduíche");
//   • subtítulo no meio (separador de grupo: "Refeitório", "TOTAL");
//   • qualificador da linha de cima ("com calha", "sem calha").
// Mover esses quebraria a leitura do orçamento.
//
// Idempotente por natureza: depois de subir, a linha não é mais a última.

/** Texto que caracteriza observação geral do orçamento (não item nem grupo). */
export function ehObservacaoGeral(texto) {
  const t = String(texto || "").trim().toLowerCase();
  if (!t) return false;
  return (
    /\breferente\b/.test(t) ||
    /medidas consideradas/.test(t) ||
    /^obs\b/.test(t) ||
    /observa[çc][ãa]o/.test(t)
  );
}

export function subirObservacoes(sqlite) {
  const candidatos = sqlite
    .prepare(
      `SELECT oi.id, oi.orcamento_id, oi.descricao
         FROM orcamento_itens oi
        WHERE oi.valor_min IS NULL
          AND oi.ordem = (SELECT MAX(o2.ordem) FROM orcamento_itens o2
                           WHERE o2.orcamento_id = oi.orcamento_id)
          AND (SELECT COUNT(*) FROM orcamento_itens o3
                WHERE o3.orcamento_id = oi.orcamento_id) > 1`
    )
    .all();

  const menorOrdem = sqlite.prepare(
    "SELECT MIN(ordem) AS m FROM orcamento_itens WHERE orcamento_id = ?"
  );
  const mover = sqlite.prepare(
    "UPDATE orcamento_itens SET ordem = ? WHERE id = ?"
  );

  const movidos = [];
  for (const c of candidatos) {
    if (!ehObservacaoGeral(c.descricao)) continue;
    const min = menorOrdem.get(c.orcamento_id).m ?? 0;
    mover.run(min - 1, c.id);
    movidos.push({ orcamentoId: c.orcamento_id, descricao: c.descricao });
  }
  return movidos;
}
