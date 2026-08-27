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
};

export default nextConfig;
