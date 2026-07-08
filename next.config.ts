import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build minimalista para container (Dokploy) — gera server.js + deps traçadas
  output: "standalone",
  // better-sqlite3 é módulo nativo: não deve ser empacotado pelo bundler
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
