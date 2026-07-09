import type { MetadataRoute } from "next";

// Web App Manifest — usado ao "adicionar à tela de início" (Android/Chrome).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gestão Toldos Gerais",
    short_name: "Toldos Gerais",
    description: "Orçamentos e atendimento da Toldos Gerais",
    start_url: "/atendimentos",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#004e36",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
