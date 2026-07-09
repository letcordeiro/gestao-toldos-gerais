"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Modelo = {
  id: number;
  nome: string;
  descricaoMaterial: string | null;
  estruturaAluminio: string | null;
  estruturaFerro: string | null;
  fixacaoVedacao: string | null;
  estruturaSempreAluminio: boolean;
  usaFormato: boolean;
};

function Secao({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold text-primary">{titulo}</h3>
      <p className="whitespace-pre-line text-sm">{texto}</p>
    </div>
  );
}

// Leitura do conteúdo de um modelo — disponível para vendedor e gestor.
export function VerModeloDialog({
  modelo,
  trigger,
}: {
  modelo: Modelo;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const temTexto =
    modelo.descricaoMaterial ||
    modelo.estruturaAluminio ||
    modelo.estruturaFerro ||
    modelo.fixacaoVedacao;

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modelo.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Secao titulo="DESCRIÇÃO DO MATERIAL" texto={modelo.descricaoMaterial} />
          <Secao
            titulo="ESTRUTURA EM ALUMÍNIO"
            texto={modelo.estruturaAluminio}
          />
          <Secao
            titulo="ESTRUTURA METÁLICA"
            texto={modelo.estruturaFerro}
          />
          <Secao
            titulo="FIXAÇÃO E VEDAÇÃO"
            texto={modelo.fixacaoVedacao}
          />
          {modelo.estruturaSempreAluminio && (
            <p className="text-xs text-muted-foreground">
              • Estrutura sempre em alumínio.
            </p>
          )}
          {modelo.usaFormato && (
            <p className="text-xs text-muted-foreground">
              • Tem escolha de formato (Capotinha / Braço Retrátil).
            </p>
          )}
          {!temTexto && (
            <p className="text-sm text-muted-foreground">
              Este modelo ainda não tem textos cadastrados.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
