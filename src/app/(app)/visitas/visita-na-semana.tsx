"use client";

import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SITUACAO_VISITA_COR, linkDoEndereco, type SituacaoVisita } from "@/lib/visitas";
import { linkWhatsApp } from "@/lib/whatsapp";
import { ExcluirVisitaButton, SituacaoVisitaSelect } from "./acoes-visita";
import { VisitaDialog, type VisitaEdicao } from "./visita-dialog";

/** O que a janela da visita mostra. Textos de data já vêm do servidor. */
export type VisitaDaSemana = {
  id: number;
  atendimentoId: number;
  clienteNome: string;
  clienteTelefone: string;
  vendedorNome: string | null;
  /** "quarta, 14/10 · 14:00 às 15:00" */
  quando: string;
  /** Para a pergunta de apagar: "14/10/2026" e "14:00". */
  data: string;
  hora: string;
  endereco: string | null;
  observacoes: string | null;
  situacao: SituacaoVisita;
  edicao: VisitaEdicao;
};

/**
 * Clicar na visita da semana abre ESTA janela, com editar à mão.
 *
 * Antes o clique levava para a tela do atendimento — que não mostra visita
 * nenhuma. Remarcar só era possível na visão Lista, e ninguém achava.
 */
export function VisitaNaSemana({
  visita,
  responsaveis,
  ehAtendente,
  children,
}: {
  visita: VisitaDaSemana;
  responsaveis: { id: number; nome: string }[];
  ehAtendente: boolean;
  /** A caixa da grade (ou a linha do celular) que abre a janela. */
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const mapa = linkDoEndereco(visita.endereco);

  return (
    <Dialog>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SITUACAO_VISITA_COR[visita.situacao] }}
            />
            {visita.clienteNome}
          </DialogTitle>
          <DialogDescription>
            {visita.quando}
            {visita.vendedorNome && ` · ${visita.vendedorNome}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          {visita.endereco && (
            <p className="flex gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              {mapa ? (
                <a href={mapa} target="_blank" rel="noopener" className="hover:underline">
                  {visita.endereco}
                </a>
              ) : (
                visita.endereco
              )}
            </p>
          )}
          {visita.observacoes && (
            <p className="rounded-md bg-secondary/50 px-3 py-2 text-muted-foreground">
              {visita.observacoes}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Situação</span>
            <SituacaoVisitaSelect visitaId={visita.id} situacao={visita.situacao} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <VisitaDialog
            visita={visita.edicao}
            atendimentoId={visita.atendimentoId}
            responsaveis={responsaveis}
            ehAtendente={ehAtendente}
            trigger={
              <Button>
                <CalendarClock className="size-4" />
                Editar / remarcar
              </Button>
            }
          />
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={linkWhatsApp(visita.clienteTelefone)} target="_blank" rel="noopener" />}
          >
            WhatsApp
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href={`/atendimentos/${visita.atendimentoId}`} />}
          >
            Abrir cliente
          </Button>
          <span className="ml-auto">
            <ExcluirVisitaButton
              visitaId={visita.id}
              clienteNome={visita.clienteNome}
              data={visita.data}
              hora={visita.hora}
            />
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
