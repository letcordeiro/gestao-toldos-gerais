"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function BuscaClientes({ q }: { q?: string }) {
  const router = useRouter();

  return (
    <Input
      placeholder="Buscar por nome ou telefone…"
      className="w-64 bg-card"
      defaultValue={q ?? ""}
      onChange={(e) => {
        const valor = e.target.value.trim();
        router.replace(
          valor
            ? `/cadastros/clientes?q=${encodeURIComponent(valor)}`
            : "/cadastros/clientes"
        );
      }}
    />
  );
}
