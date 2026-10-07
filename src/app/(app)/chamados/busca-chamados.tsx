"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

/**
 * Busca da lista de chamados (assunto ou cliente). Mesmo molde da busca de
 * clientes: espera 300 ms depois da última letra e troca a URL sem pular para
 * o topo. O `ver` vai junto para a busca não devolver quem está olhando os
 * encerrados para os abertos.
 */
export function BuscaChamados({
  q,
  ver,
}: {
  q?: string;
  ver?: string;
}) {
  const router = useRouter();
  // Valor inicial fixo: o campo é não controlado, e trocar o defaultValue
  // depois de montado só gera aviso no console.
  const inicial = useRef(q ?? "");
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (espera.current) clearTimeout(espera.current);
    },
    []
  );

  return (
    <Input
      type="search"
      aria-label="Buscar chamado"
      placeholder="Buscar por assunto ou cliente…"
      className="w-full bg-card sm:w-72"
      defaultValue={inicial.current}
      onChange={(e) => {
        const valor = e.target.value.trim();
        if (espera.current) clearTimeout(espera.current);
        espera.current = setTimeout(() => {
          const params = new URLSearchParams();
          if (ver === "fechados") params.set("ver", ver);
          if (valor) params.set("q", valor);
          const query = params.toString();
// A pessoa pode ter clicado no menu durante a espera de 300 ms: com a
          // conexão lenta, a tela nova ainda não chegou e esta busca passava
          // POR CIMA do clique — "cliquei no menu e nada" (auditoria de
          // 07/10/2026). Só busca se ainda estamos nesta tela.
          if (window.location.pathname !== "/chamados") return;
          router.replace(query ? `/chamados?${query}` : "/chamados", {
            scroll: false,
          });
        }, 300);
      }}
    />
  );
}
