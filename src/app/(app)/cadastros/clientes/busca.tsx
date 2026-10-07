"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function BuscaClientes({
  q,
  filtro,
}: {
  q?: string;
  filtro?: string;
}) {
  const router = useRouter();
  // Valor inicial fixo: o campo é não controlado, e trocar o defaultValue
  // depois de montado só gera aviso no console.
  const inicial = useRef(q ?? "");
  // Espera a pessoa parar de digitar: trocar a URL a cada letra refazia a
  // consulta à toa e, sem `scroll: false`, jogava a página para o topo.
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (espera.current) clearTimeout(espera.current);
    },
    []
  );

  return (
    <Input
      placeholder="Buscar por nome ou telefone…"
      className="w-64 bg-card"
      defaultValue={inicial.current}
      onChange={(e) => {
        const valor = e.target.value.trim();
        if (espera.current) clearTimeout(espera.current);
        espera.current = setTimeout(() => {
          const params = new URLSearchParams();
          if (valor) params.set("q", valor);
          // mantém a aba (Ativos/Inativos/Todos) ao digitar na busca
          if (filtro && filtro !== "ativos") params.set("filtro", filtro);
          const query = params.toString();
// A pessoa pode ter clicado no menu durante a espera de 300 ms: com a
          // conexão lenta, a tela nova ainda não chegou e esta busca passava
          // POR CIMA do clique — "cliquei no menu e nada" (auditoria de
          // 07/10/2026). Só busca se ainda estamos nesta tela.
          if (window.location.pathname !== "/cadastros/clientes") return;
          router.replace(
            query ? `/cadastros/clientes?${query}` : "/cadastros/clientes",
            { scroll: false }
          );
        }, 300);
      }}
    />
  );
}
