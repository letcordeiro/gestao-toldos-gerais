"use client";

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

  return (
    <Input
      placeholder="Buscar por nome ou telefone…"
      className="w-64 bg-card"
      defaultValue={q ?? ""}
      onChange={(e) => {
        const valor = e.target.value.trim();
        const params = new URLSearchParams();
        if (valor) params.set("q", valor);
        // mantém a aba (Ativos/Inativos/Todos) ao digitar na busca
        if (filtro && filtro !== "ativos") params.set("filtro", filtro);
        const query = params.toString();
        router.replace(
          query ? `/cadastros/clientes?${query}` : "/cadastros/clientes"
        );
      }}
    />
  );
}
