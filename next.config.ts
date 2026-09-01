import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build minimalista para container (Dokploy) — gera server.js + deps traçadas
  output: "standalone",
  // Pasta de build alternativa via env. Sem isto, `NEXT_DIST_DIR=... next build`
  // é silenciosamente ignorado e o build escreve por cima do `.next` que o dev
  // server está usando — o servidor passa a dar ENOENT em build-manifest.json e
  // a tela morre com "Internal Server Error". Aconteceu 3x em 27/08/2026.
  // O padrão `/.next-*/` já está no .gitignore (pasta de build fora dele
  // envenena o Tailwind).
  ...(process.env.NEXT_DIST_DIR
    ? { distDir: process.env.NEXT_DIST_DIR }
    : {}),
  // better-sqlite3 é módulo nativo: não deve ser empacotado pelo bundler
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // O padrão do Next é 1 MB, e o formulário de orçamento aceita foto de
      // até 8 MB: qualquer foto de celular estourava o envio INTEIRO com
      // "Application error", sem dizer o motivo. Derrubou os orçamentos do
      // João o dia 31/08/2026 todo — e não aparecia para quem testava sem
      // anexar foto.
      // 40 MB = quatro fotos no limite de 8 MB com folga para o resto do
      // formulário. O formulário barra antes de chegar aqui (MAX_ENVIO_BYTES
      // em lib/uploads), então este teto é a última linha, não a primeira.
      bodySizeLimit: "40mb",
    },
  },
};

export default nextConfig;
