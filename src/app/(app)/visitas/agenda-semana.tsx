import Link from "next/link";
import { cn } from "@/lib/utils";
import { DIAS_SEMANA, hhmmDe } from "@/lib/agenda";
import { SITUACAO_VISITA_COR, type SituacaoVisita } from "@/lib/visitas";

/**
 * A semana da agenda do próprio sistema (13/10/2026): visitas e bloqueios,
 * dia a dia. No computador é uma grade de horários (segunda a domingo); no
 * celular, a mesma semana em lista — sete colunas não cabem numa tela de 375px.
 */

export type ItemDaSemana =
  | {
      tipo: "visita";
      id: number;
      dia: string; // "aaaa-mm-dd"
      inicioMin: number;
      fimMin: number;
      titulo: string; // cliente
      detalhe: string | null; // vendedor (quando a tela mostra vários)
      situacao: SituacaoVisita;
      href: string;
    }
  | {
      tipo: "bloqueio";
      id: string;
      dia: string;
      inicioMin: number;
      fimMin: number;
      /** Motivo para quem pode ver; "Indisponível" para os outros. */
      titulo: string;
      detalhe: string | null;
    };

const ALTURA_HORA = 44; // px por hora na grade

function rotuloDia(diaISO: string): { semana: string; numero: string } {
  const [a, m, d] = diaISO.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return { semana: DIAS_SEMANA[dow].slice(0, 3), numero: `${d}/${m}` };
}

export function AgendaSemana({
  dias,
  itens,
  hoje,
}: {
  dias: string[];
  itens: ItemDaSemana[];
  hoje: string;
}) {
  // A grade vai das 8h às 18h e cresce para caber o que houver fora disso
  // (a faculdade das 19h às 22h tem que aparecer).
  const inicioHora = Math.min(8, ...itens.map((i) => Math.floor(i.inicioMin / 60)));
  const fimHora = Math.max(18, ...itens.map((i) => Math.ceil(i.fimMin / 60)));
  const horas = Array.from({ length: fimHora - inicioHora }, (_, i) => inicioHora + i);
  const doDia = (dia: string) =>
    itens.filter((i) => i.dia === dia).sort((a, b) => a.inicioMin - b.inicioMin);

  return (
    <>
      {/* Computador: grade */}
      <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
        <div className="grid min-w-[840px]" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          <div />
          {dias.map((dia) => {
            const r = rotuloDia(dia);
            return (
              <div
                key={dia}
                className={cn(
                  "border-b border-l px-2 py-1.5 text-center text-xs",
                  dia === hoje ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground"
                )}
              >
                <span className="capitalize">{r.semana}</span> {r.numero}
              </div>
            );
          })}

          {/* Coluna das horas */}
          <div className="relative" style={{ height: horas.length * ALTURA_HORA }}>
            {horas.map((h, i) => (
              <span
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: i * ALTURA_HORA }}
              >
                {i === 0 ? "" : `${h}h`}
              </span>
            ))}
          </div>

          {dias.map((dia) => (
            <div
              key={dia}
              className={cn("relative border-l", dia === hoje && "bg-primary/[0.03]")}
              style={{ height: horas.length * ALTURA_HORA }}
            >
              {horas.map((h, i) => (
                <div key={h} className="absolute inset-x-0 border-t border-dashed border-border/70" style={{ top: i * ALTURA_HORA }} />
              ))}
              {doDia(dia).map((item) => {
                const top = ((item.inicioMin - inicioHora * 60) / 60) * ALTURA_HORA;
                const altura = Math.max(18, ((item.fimMin - item.inicioMin) / 60) * ALTURA_HORA - 2);
                const caixa = (
                  <div
                    className={cn(
                      "absolute inset-x-1 overflow-hidden rounded px-1.5 py-0.5 text-[11px] leading-tight",
                      item.tipo === "visita"
                        ? "border-l-4 bg-card shadow-sm hover:bg-secondary"
                        : "border border-dashed bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_6px,transparent_6px,transparent_12px)] text-muted-foreground"
                    )}
                    style={{
                      top,
                      height: altura,
                      ...(item.tipo === "visita" ? { borderLeftColor: SITUACAO_VISITA_COR[item.situacao] } : {}),
                    }}
                    title={`${hhmmDe(item.inicioMin)}–${hhmmDe(item.fimMin)} ${item.titulo}`}
                  >
                    <span className="font-medium tabular-nums">{hhmmDe(item.inicioMin)}</span>{" "}
                    <span className={item.tipo === "visita" ? "font-medium" : ""}>{item.titulo}</span>
                    {item.detalhe && <span className="block truncate text-muted-foreground">{item.detalhe}</span>}
                  </div>
                );
                return item.tipo === "visita" ? (
                  <Link key={`v${item.id}`} href={item.href}>
                    {caixa}
                  </Link>
                ) : (
                  <div key={item.id}>{caixa}</div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Celular: a semana em lista, dia a dia */}
      <div className="space-y-3 md:hidden">
        {dias.map((dia) => {
          const r = rotuloDia(dia);
          const lista = doDia(dia);
          return (
            <section key={dia} className="rounded-lg border bg-card">
              <h3
                className={cn(
                  "border-b px-3 py-1.5 text-sm font-medium capitalize",
                  dia === hoje && "bg-primary/10 text-primary"
                )}
              >
                {r.semana} {r.numero}
                {dia === hoje && <span className="ml-2 text-xs normal-case">hoje</span>}
              </h3>
              {lista.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Livre</p>
              ) : (
                <ul className="divide-y">
                  {lista.map((item) => {
                    const linha = (
                      <div className="flex gap-3 px-3 py-2 text-sm">
                        <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
                          {hhmmDe(item.inicioMin)}–{hhmmDe(item.fimMin)}
                        </span>
                        <span className="min-w-0">
                          <span className={item.tipo === "visita" ? "font-medium text-primary" : "text-muted-foreground"}>
                            {item.titulo}
                          </span>
                          {item.detalhe && <span className="block text-xs text-muted-foreground">{item.detalhe}</span>}
                        </span>
                      </div>
                    );
                    return (
                      <li key={item.tipo === "visita" ? `v${item.id}` : item.id}>
                        {item.tipo === "visita" ? <Link href={item.href}>{linha}</Link> : linha}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
