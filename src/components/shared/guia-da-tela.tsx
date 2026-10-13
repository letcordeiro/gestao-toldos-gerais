"use client";

import { Fragment, useRef } from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SecaoGuia } from "@/lib/guia-visitas";

/** `**negrito**` → <strong>. Nome de botão vem assim no texto do guia. */
function Rico({ texto }: { texto: string }) {
  const partes = texto.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {p}
          </strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

/**
 * Botão "Como usar" + o guia da tela numa janela.
 *
 * O texto vem pronto do servidor, já filtrado pelo papel de quem está vendo:
 * cada perfil lê só os botões que tem. O índice no alto pula para a seção —
 * quem abre o guia quase sempre tem UMA dúvida, não quer ler tudo.
 */
export function GuiaDaTela({
  titulo,
  descricao,
  secoes,
}: {
  titulo: string;
  descricao: string;
  secoes: SecaoGuia[];
}) {
  const corpo = useRef<HTMLDivElement>(null);
  const cabecalho = useRef<HTMLDivElement>(null);

  // Rola a janela (não a página) até a seção, descontando o cabeçalho fixo.
  // scrollIntoView com scroll-margin fixo errava no celular, onde o índice
  // quebra em mais linhas e o cabeçalho fica mais alto.
  const irPara = (id: string) => {
    const alvo = corpo.current?.querySelector<HTMLElement>(`[data-secao="${id}"]`);
    const janela = alvo?.offsetParent;
    if (!alvo || !(janela instanceof HTMLElement)) return;
    const altura = cabecalho.current?.offsetHeight ?? 0;
    janela.scrollTo({ top: alvo.offsetTop - altura - 16, behavior: "smooth" });
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" className="text-muted-foreground">
            <CircleHelp className="size-4" />
            Como usar
          </Button>
        }
      />
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <div ref={corpo} className="contents">
          <DialogHeader
            ref={cabecalho}
            className="sticky top-0 z-10 gap-2 border-b bg-popover px-5 pt-5 pb-3"
          >
            <DialogTitle className="pr-8 text-lg">{titulo}</DialogTitle>
            <DialogDescription>{descricao}</DialogDescription>
            {/* No celular o índice é uma linha que rola de lado: quebrando em
                várias, o cabeçalho fixo comia metade da tela. */}
            <nav
              aria-label="Assuntos do guia"
              className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pt-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              {secoes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => irPara(s.id)}
                  className="shrink-0 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap text-muted-foreground hover:border-primary hover:text-primary focus-visible:border-primary focus-visible:text-primary focus-visible:outline-none"
                >
                  {s.titulo}
                </button>
              ))}
            </nav>
          </DialogHeader>

          <div className="space-y-7 px-5 py-5">
            {secoes.map((s) => (
              <section
                key={s.id}
                data-secao={s.id}
                className="space-y-2.5"
              >
                <div>
                  <h3 className="text-base font-semibold text-balance">{s.titulo}</h3>
                  <p className="text-muted-foreground">
                    <Rico texto={s.resumo} />
                  </p>
                </div>

                {s.passos && (
                  <ol className="space-y-2">
                    {s.passos.map((p, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold tabular-nums text-primary">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">
                          <Rico texto={p} />
                        </span>
                      </li>
                    ))}
                  </ol>
                )}

                {s.pontos && (
                  <ul className="space-y-1.5">
                    {s.pontos.map((p, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span className="text-muted-foreground">
                          <Rico texto={p} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {s.tabela && (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/60">
                        <tr>
                          {s.tabela.cabecalho.map((c, i) => (
                            <th key={i} className="px-3 py-2 font-semibold whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {s.tabela.linhas.map((linha, i) => (
                          <tr key={i}>
                            {linha.map((c, j) => (
                              <td
                                key={j}
                                className={
                                  "px-3 py-2 align-top " +
                                  (j === 0 ? "font-medium" : "text-muted-foreground")
                                }
                              >
                                <Rico texto={c} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {s.atencao && (
                  <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    <Rico texto={s.atencao} />
                  </p>
                )}
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
