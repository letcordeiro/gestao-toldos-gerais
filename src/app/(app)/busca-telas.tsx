"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { filtrarTelas, type Tela } from "@/lib/telas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Busca de telas.
 *
 * O sistema tem mais de trinta telas e seis na barra; o resto está dentro do
 * menu "Mais", em grupos que fazem sentido para quem montou o menu e nem
 * sempre para quem está procurando. Aqui se digita o nome — ou o apelido, em
 * `lib/telas.ts` — e chega-se na tela sem saber em que gaveta ela mora.
 *
 * Atalhos: "/" em qualquer lugar (menos dentro de um campo) e Ctrl/⌘+K.
 */
export function BuscaTelas({ telas }: { telas: Tela[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(0);
  // O destino espera o diálogo terminar de fechar. Navegar junto com o
  // fechamento deixa o fundo do diálogo órfão na página, engolindo todo
  // clique — é o "site trava" de 02/09/2026, descrito no CLAUDE.md.
  const [destino, setDestino] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  const achadas = useMemo(() => filtrarTelas(telas, busca), [telas, busca]);

  function abrir() {
    setBusca("");
    setAtivo(0);
    setAberto(true);
  }

  // "/" e Ctrl/⌘+K abrem de qualquer lugar. O "/" só vale fora de campo de
  // texto: senão ninguém escreve "3/4 de metro" na descrição de um orçamento.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      const digitando =
        alvo?.tagName === "INPUT" ||
        alvo?.tagName === "TEXTAREA" ||
        alvo?.isContentEditable === true;
      const atalho =
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !digitando && !e.metaKey && !e.ctrlKey);
      if (!atalho) return;
      e.preventDefault();
      abrir();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  // O cursor tem que nascer dentro do campo: quem abre a busca já está com a
  // palavra na cabeça e digita na hora. O `initialFocus` do diálogo não deu
  // conta sozinho — o foco ficava no botão que abriu, e as primeiras letras
  // se perdiam. O segundo foco, depois que o diálogo terminou de montar,
  // existe porque a gestão de foco do Base UI roda DEPOIS deste efeito.
  useEffect(() => {
    if (!aberto) return;
    campo.current?.focus();
    const t = setTimeout(() => campo.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [aberto]);

  // Mantém o item marcado visível quando se desce a lista pelo teclado.
  useEffect(() => {
    lista.current
      ?.querySelector('[data-marcado="sim"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [ativo, busca]);

  function ir(href: string) {
    setDestino(href);
    setAberto(false);
  }

  function aoTeclarNoCampo(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((i) => (achadas.length === 0 ? 0 : (i + 1) % achadas.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) =>
        achadas.length === 0 ? 0 : (i - 1 + achadas.length) % achadas.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const escolhida = achadas[ativo];
      if (escolhida) ir(escolhida.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Buscar tela"
        title="Buscar tela (atalho: /)"
        data-tour="busca"
        className={cn(
          "flex items-center gap-2 rounded-full text-muted-foreground transition-colors",
          // No celular a lupa tem alvo de dedo (40px); no desktop vira campo.
          "size-10 justify-center hover:bg-secondary hover:text-foreground",
          // No desktop vira um campo de busca de mentira: quem vê um campo
          // sabe que pode digitar; quem vê só uma lupa precisa adivinhar.
          "md:size-auto md:h-8 md:w-44 md:justify-start md:border md:bg-background md:px-3 md:text-sm md:hover:border-ring"
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden md:inline">Buscar tela</span>
        <kbd className="ml-auto hidden rounded border px-1 text-[10px] leading-4 md:inline">
          /
        </kbd>
      </button>

      <Dialog
        open={aberto}
        onOpenChange={setAberto}
        onOpenChangeComplete={(open) => {
          if (open || !destino) return;
          router.push(destino);
          setDestino(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          initialFocus={campo}
          className="top-4 max-w-lg translate-y-0 gap-0 p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Buscar tela</DialogTitle>
          <DialogDescription className="sr-only">
            Digite o nome da tela que você procura e aperte Enter.
          </DialogDescription>

          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={campo}
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setAtivo(0);
              }}
              onKeyDown={aoTeclarNoCampo}
              placeholder="Buscar tela…"
              aria-label="Buscar tela"
              role="combobox"
              aria-expanded
              aria-controls="resultados-busca-telas"
              aria-activedescendant={
                achadas[ativo] ? `tela-${ativo}` : undefined
              }
              className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
            {/* No celular não existe Esc: sem isto a única saída era adivinhar
                que dava para tocar fora da caixa. */}
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="shrink-0 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground md:hidden"
            >
              Cancelar
            </button>
          </div>

          <div
            ref={lista}
            id="resultados-busca-telas"
            role="listbox"
            aria-label="Telas"
            className="max-h-[60dvh] overflow-y-auto p-1.5"
          >
            {achadas.length === 0 ? (
              <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">
                Nenhuma tela com esse nome.
              </p>
            ) : (
              achadas.map((tela, i) => (
                <button
                  key={tela.href}
                  id={`tela-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === ativo}
                  data-marcado={i === ativo ? "sim" : "nao"}
                  onMouseMove={() => setAtivo(i)}
                  onClick={() => ir(tela.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    i === ativo ? "bg-secondary" : "hover:bg-secondary/60"
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {tela.label}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {tela.ajuda}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {tela.grupo}
                  </span>
                </button>
              ))
            )}
          </div>

          <p className="hidden items-center justify-end gap-1 border-t px-3 py-2 text-[11px] text-muted-foreground md:flex">
            <CornerDownLeft className="size-3" /> abre a tela · ↑↓ navega · esc
            fecha
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
