"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Fase = { id: number; nome: string; cor: string; total: number };

export function FiltrosFunil({
  fases,
  totalGeral,
  q,
  fase,
  ordem,
  dir,
}: {
  fases: Fase[];
  /** Quantos atendimentos a visão padrão mostra (sem os perdidos). */
  totalGeral: number;
  q?: string;
  fase?: string;
  ordem?: string;
  dir?: string;
}) {
  const router = useRouter();
  // A busca espera a pessoa parar de digitar (~300 ms) antes de navegar. Um
  // router.replace por tecla refazia a consulta inteira a cada letra e a lista
  // piscava enquanto se digitava o nome.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  // O que está no campo agora e o último termo que ESTE campo mandou para a URL.
  const qDigitado = useRef(q ?? "");
  const qEnviado = useRef(q ?? "");

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  // O campo é não controlado; quando a busca muda por fora (o "limpar filtro"
  // da lista, voltar no navegador), ele precisa acompanhar. Mudança que o
  // próprio campo mandou é ignorada, senão a resposta atrasada de "ab"
  // apagaria o "c" digitado enquanto ela vinha.
  useEffect(() => {
    const daUrl = q ?? "";
    if (daUrl === qEnviado.current) return;
    qEnviado.current = daUrl;
    qDigitado.current = daUrl;
    if (campo.current) campo.current.value = daUrl;
  }, [q]);

  function atualizar(mudanca: { q?: string; fase?: string }) {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const params = new URLSearchParams();
    // Trocar a fase no meio da digitação leva junto o que já foi digitado.
    const novoQ = mudanca.q ?? qDigitado.current;
    qEnviado.current = novoQ;
    const novaFase = mudanca.fase ?? fase ?? "";
    if (novoQ) params.set("q", novoQ);
    if (novaFase) params.set("fase", novaFase);
    // Filtrar não pode desfazer a ordenação escolhida.
    if (ordem) params.set("ordem", ordem);
    if (dir) params.set("dir", dir);
    // scroll: false — digitar na busca não pode jogar a página para o topo.
    router.replace(`/atendimentos?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar por nome ou telefone…"
        className="w-64 bg-card"
        ref={campo}
        defaultValue={q ?? ""}
        onChange={(e) => {
          qDigitado.current = e.target.value.trim();
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(
            () => atualizar({ q: qDigitado.current }),
            300
          );
        }}
      />
      <Select
        value={fase ?? "todas"}
        items={[
          { value: "todas", label: `Todas as fases (${totalGeral})` },
          ...fases.map((f) => ({
            value: String(f.id),
            label: `${f.nome} (${f.total})`,
          })),
        ]}
        onValueChange={(v) =>
          atualizar({ fase: !v || v === "todas" ? "" : v })
        }
      >
        <SelectTrigger className="w-[240px] bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as fases ({totalGeral})</SelectItem>
          {fases.map((f) => (
            <SelectItem key={f.id} value={String(f.id)}>
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: f.cor }}
              />
              {f.nome}{" "}
              <span className="text-muted-foreground">({f.total})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
