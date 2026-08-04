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
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
