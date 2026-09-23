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
      defaultValue={q ?? ""}
      onChange={(e) => {
        const valor = e.target.value.trim();
        if (espera.current) clearTimeout(espera.current);
        espera.current = setTimeout(() => {
          const params = new URLSearchParams();
          if (ver === "fechados") params.set("ver", ver);
          if (valor) params.set("q", valor);
          const query = params.toString();
          router.replace(query ? `/chamados?${query}` : "/chamados", {
            scroll: false,
          });
        }, 300);
      }}
    />
  );
}
