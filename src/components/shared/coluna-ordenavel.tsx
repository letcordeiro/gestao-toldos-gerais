import Link from "next/link";
import { direcaoDe, linkDaColuna } from "@/lib/ordenacao";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de tabela que ordena. É um `<Link>` puro: funciona sem javascript,
 * o estado fica na URL (dá para salvar a visão) e `scroll={false}` impede o
 * Next de jogar a página para o topo — senão a tabela sai da vista a cada
 * clique e parece que a ordenação não fez nada.
 *
 * Clicar na coluna já ativa inverte o sentido; nas outras, começa crescente.
 */
export function ColunaOrdenavel({
  base,
  chave,
  ordem,
  dir,
  extras,
  nomeOrdem,
  nomeDir,
  className,
  children,
}: {
  /** Caminho da tela, ex.: "/orcamentos". */
  base: string;
  /** Nome da coluna na URL, ex.: "cliente". */
  chave: string;
  ordem?: string;
  dir?: string;
  /** Filtros a preservar ao trocar a ordenação (busca, status, etc.). */
  extras?: Record<string, string | undefined>;
  /** Nomes dos parâmetros na URL — telas com duas tabelas usam pares próprios. */
  nomeOrdem?: string;
  nomeDir?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ativa = ordem === chave;
  const crescente = direcaoDe(dir) === "asc";
  return (
    <TableHead className={cn("p-0", className)}>
      <Link
        href={linkDaColuna(base, chave, ordem, dir, extras, nomeOrdem, nomeDir)}
        scroll={false}
        aria-sort={ativa ? (crescente ? "ascending" : "descending") : "none"}
        className={cn(
          "flex w-full items-center gap-1.5 px-4 py-3 text-left transition-colors hover:bg-secondary",
          ativa && "font-semibold text-foreground"
        )}
      >
        {children}
        <span
          aria-hidden
          className={cn("text-[10px]", ativa ? "text-primary" : "opacity-30")}
        >
          {ativa && !crescente ? "▼" : "▲"}
        </span>
      </Link>
    </TableHead>
  );
}
