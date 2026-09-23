"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Card ou linha de lista em que clicar em QUALQUER ponto abre o registro.
 *
 * Pedido da Letícia (23/09/2026): antes só Orçamentos funcionava assim; nas
 * outras listas era preciso acertar o nome verde, e quem aprendia numa tela
 * errava na outra. Agora todas as listas com tela de detalhe usam isto.
 *
 * O que NÃO abre o registro, de propósito:
 * - clique em botão, link, campo ou seletor DENTRO do card (WhatsApp, mudar
 *   fase, excluir…) — cada um faz a própria coisa. Marque com
 *   `data-nao-abrir` qualquer outra área que precise ficar de fora;
 * - clique dentro de algo aberto POR CIMA do card (menu, seletor, diálogo);
 * - arrastar para selecionar texto (copiar telefone não pode abrir a tela).
 *
 * Ctrl/⌘+clique e clique do meio abrem em aba nova, como num link comum.
 * O teclado continua indo pelo link do nome, que segue existindo — o card
 * inteiro é um atalho para o mouse e o dedo, não o único caminho.
 */
function deveAbrir(e: React.MouseEvent): boolean {
  const alvo = e.target as HTMLElement | null;
  // Clique vindo de um PORTAL — a lista de fases, um menu, a confirmação de
  // excluir — sobe pela árvore do React até o card, mesmo estando fora dele
  // na página. Sem esta linha, escolher uma fase no seletor da linha abria o
  // atendimento junto.
  if (!alvo || !e.currentTarget.contains(alvo)) return false;
  if (
    alvo?.closest(
      'a, button, input, select, textarea, label, [role="button"], [role="combobox"], [role="menuitem"], [data-nao-abrir]'
    )
  ) {
    return false;
  }
  if (typeof window !== "undefined" && window.getSelection()?.toString()) {
    return false;
  }
  return true;
}

function useAbrir(href: string) {
  const router = useRouter();
  return {
    onClick(e: React.MouseEvent) {
      if (!deveAbrir(e)) return;
      if (e.metaKey || e.ctrlKey) {
        window.open(href, "_blank", "noopener");
        return;
      }
      router.push(href);
    },
    onAuxClick(e: React.MouseEvent) {
      // botão do meio
      if (e.button !== 1 || !deveAbrir(e)) return;
      window.open(href, "_blank", "noopener");
    },
  };
}

/** Linha de tabela clicável. */
export function LinhaClicavel({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const abrir = useAbrir(href);
  return (
    <TableRow
      {...abrir}
      className={cn(
        "cursor-pointer transition-colors hover:bg-secondary/60",
        className
      )}
    >
      {children}
    </TableRow>
  );
}

/**
 * Card (ou item de lista) clicável. Por padrão vira `<li>`.
 * `href` nulo = item sem tela para abrir (ex.: tarefa sem cliente): fica um
 * item comum, sem mãozinha nem destaque — prometer clique que não leva a
 * lugar nenhum é pior do que não prometer.
 */
export function CartaoClicavel({
  href,
  como = "li",
  className,
  children,
}: {
  href: string | null;
  como?: "li" | "div";
  className?: string;
  children: React.ReactNode;
}) {
  const abrir = useAbrir(href ?? "");
  const Tag = como;
  if (!href) return <Tag className={className}>{children}</Tag>;
  return (
    <Tag
      {...abrir}
      className={cn(
        "cursor-pointer transition-colors hover:bg-secondary/60",
        className
      )}
    >
      {children}
    </Tag>
  );
}
