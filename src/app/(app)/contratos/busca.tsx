"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function BuscaContratos({
  q,
  status,
}: {
  q?: string;
  status?: string;
}) {
  const router = useRouter();

  return (
    <Input
      placeholder="Buscar por cliente ou número…"
      className="w-64 bg-card"
      defaultValue={q ?? ""}
      onChange={(e) => {
        const valor = e.target.value.trim();
        const params = new URLSearchParams();
        if (valor) params.set("q", valor);
        // mantém o filtro de status ao digitar
        if (status && status !== "todos") params.set("status", status);
        const query = params.toString();
        router.replace(query ? `/contratos?${query}` : "/contratos");
      }}
    />
  );
}
