"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Fase = { id: number; nome: string; cor: string };

export function FiltrosFunil({
  fases,
  q,
  fase,
}: {
  fases: Fase[];
  q?: string;
  fase?: string;
}) {
  const router = useRouter();

  function atualizar(mudanca: { q?: string; fase?: string }) {
    const params = new URLSearchParams();
    const novoQ = mudanca.q ?? q ?? "";
    const novaFase = mudanca.fase ?? fase ?? "";
    if (novoQ) params.set("q", novoQ);
    if (novaFase) params.set("fase", novaFase);
    router.replace(`/atendimentos?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar por nome ou telefone…"
        className="w-64 bg-card"
        defaultValue={q ?? ""}
        onChange={(e) => atualizar({ q: e.target.value.trim() })}
      />
      <Select
        value={fase ?? "todas"}
        items={[
          { value: "todas", label: "Todas as fases" },
          ...fases.map((f) => ({ value: String(f.id), label: f.nome })),
        ]}
        onValueChange={(v) =>
          atualizar({ fase: !v || v === "todas" ? "" : v })
        }
      >
        <SelectTrigger className="w-[220px] bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as fases</SelectItem>
          {fases.map((f) => (
            <SelectItem key={f.id} value={String(f.id)}>
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: f.cor }}
              />
              {f.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
