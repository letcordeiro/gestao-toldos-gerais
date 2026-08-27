// Monta o resumo com os dados reais do banco e grava um HTML para olhar.
// Não envia e-mail nenhum.
import fs from "node:fs";
import { montarEmail, montarSecoes } from "../src/lib/resumo-conteudo.js";
import { BLOCOS } from "../src/lib/resumo.js";

const secoes = await montarSecoes(BLOCOS.map((b) => b.chave));
const { assunto, html, texto } = montarEmail({
  nome: "Resumo da manhã",
  secoes,
  mensagem: null,
  urlSistema: "http://localhost:3008",
});

const saida = process.argv[2] ?? "resumo-preview.html";
fs.writeFileSync(saida, html);
console.log("assunto:", assunto);
console.log("---- texto ----");
console.log(texto);
console.log("---------------");
console.log("html em", saida);
