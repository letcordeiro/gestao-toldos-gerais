import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Cada tela define seu título; o template mantém a marca no fim.
  title: {
    default: "Gestão Toldos Gerais",
    template: "%s · Toldos Gerais",
  },
  description:
    "Sistema interno de orçamentos e funil de atendimento da Toldos Gerais",
  // Nome e comportamento ao adicionar à tela de início do celular.
  applicationName: "Toldos Gerais",
  appleWebApp: {
    capable: true,
    title: "Toldos Gerais",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#004e36",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        {/* Os avisos nascem ABAIXO da barra do menu (offset), nunca por cima.
            Em cima dela eles tampavam Visitas/Instalações/Tarefas, e o mouse
            a caminho do menu parava sobre eles — o sonner pausa o tempo de
            fechar enquanto o mouse está em cima, então ficavam lá para
            sempre (07/10/2026). O X fecha na hora, para quem usa toque. */}
        <Toaster
          position="top-center"
          richColors
          closeButton
          offset={{ top: 72 }}
          mobileOffset={{ top: 68 }}
        />
      </body>
    </html>
  );
}
