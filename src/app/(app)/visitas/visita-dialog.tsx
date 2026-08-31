"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SeletorCliente } from "@/components/shared/seletor-cliente";
import {
  disponibilidadeDoDia,
  enderecoDoAtendimento,
  salvarVisita,
  type DisponibilidadeDoDia,
  type VisitaFormState,
} from "./actions";

const SELECT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm";

export type VisitaEdicao = {
  id: number;
  inicioEm: Date;
  duracaoMin: number;
  endereco: string | null;
  observacoes: string | null;
  vendedorId: number | null;
};

/** Date → "2026-09-01T09:00", que é o formato do input datetime-local. */
function paraInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export type AtendimentoOpcao = {
  id: number;
  clienteNome: string;
  clienteTelefone: string;
  faseNome: string;
};

export function VisitaDialog({
  visita,
  atendimentoId,
  atendimentos = [],
  responsaveis = [],
  ehAtendente = false,
  trigger,
}: {
  visita?: VisitaEdicao;
  /** Fixo quando o diálogo abre de dentro de um atendimento. */
  atendimentoId?: number;
  /** Para escolher o cliente aqui dentro, quando não há atendimento fixo. */
  atendimentos?: AtendimentoOpcao[];
  responsaveis?: { id: number; nome: string }[];
  /** Atendente marca a agenda dos outros: precisa dizer quem vai. */
  ehAtendente?: boolean;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [endereco, setEndereco] = useState(visita?.endereco ?? "");
  // Quando não vem atendimento fixo, ele é escolhido aqui.
  const [escolhido, setEscolhido] = useState<string>(
    atendimentoId ? String(atendimentoId) : ""
  );
  const alvo = atendimentoId ?? (escolhido ? Number(escolhido) : null);
  // Estes três passam a ser controlados porque a agenda depende deles: mudar
  // o dia, a duração ou quem vai muda o que está livre.
  const [inicio, setInicio] = useState(
    visita ? paraInput(visita.inicioEm) : padraoInicial()
  );
  const [duracao, setDuracao] = useState(String(visita?.duracaoMin ?? 60));
  const [quemVai, setQuemVai] = useState(String(visita?.vendedorId ?? ""));
  const [agenda, setAgenda] = useState<DisponibilidadeDoDia | null>(null);
  const [olhandoAgenda, setOlhandoAgenda] = useState(false);

  const dia = inicio.slice(0, 10);
  useEffect(() => {
    if (!aberto || !dia) return;
    let atual = true;
    setOlhandoAgenda(true);
    disponibilidadeDoDia(
      quemVai ? Number(quemVai) : null,
      dia,
      Number(duracao) || 60,
      visita?.id
    )
      .then((r) => {
        if (atual) setAgenda(r);
      })
      .catch(() => {
        if (atual) setAgenda(null);
      })
      .finally(() => {
        if (atual) setOlhandoAgenda(false);
      });
    return () => {
      atual = false;
    };
  }, [aberto, dia, duracao, quemVai, visita?.id]);

  const [state, formAction, pending] = useActionState<VisitaFormState, FormData>(
    salvarVisita,
    {}
  );

  useEffect(() => {
    if (state.ok) {
      setAberto(false);
      router.refresh();
    }
  }, [state, router]);

  // Traz o endereço do cliente escolhido — quase sempre é onde a visita
  // acontece, e digitar de novo só gera erro. Ao trocar de cliente, troca
  // junto: manter o endereço do anterior mandaria a equipe para o lugar errado.
  useEffect(() => {
    if (!aberto || visita || alvo == null) return;
    enderecoDoAtendimento(alvo)
      .then((e) => setEndereco(e))
      .catch(() => {});
  }, [aberto, visita, alvo]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {visita ? "Editar visita" : "Agendar visita"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {visita && <input type="hidden" name="id" value={visita.id} />}
          <input type="hidden" name="atendimentoId" value={alvo ?? ""} />

          {!atendimentoId && (
            <div className="space-y-1.5">
              <Label htmlFor="escolhaAtendimento">Cliente *</Label>
              <SeletorCliente
                id="escolhaAtendimento"
                opcoes={atendimentos.map((a) => ({ ...a, detalhe: a.faseNome }))}
                valor={escolhido}
                onValorChange={setEscolhido}
              />
              {atendimentos.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum atendimento em aberto. Crie um em Atendimentos antes
                  de marcar a visita.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1.5">
              <Label htmlFor="inicio">Quando *</Label>
              <Input
                id="inicio"
                name="inicio"
                type="datetime-local"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duracaoMin">Duração (min)</Label>
              <Input
                id="duracaoMin"
                name="duracaoMin"
                type="number"
                min={15}
                max={600}
                step={15}
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
              />
            </div>
          </div>

          <PainelDaAgenda
            agenda={agenda}
            carregando={olhandoAgenda}
            onEscolher={(hhmm) => setInicio(`${dia}T${hhmm}`)}
          />

          <div className="space-y-1.5">
            <Label htmlFor="endereco">Endereço da visita</Label>
            <Input
              id="endereco"
              name="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Onde a equipe vai"
            />
            <p className="text-xs text-muted-foreground">
              Vem do cadastro do cliente, mas dá para trocar: a obra costuma
              ser em outro endereço. É este que entra na rota do dia.
            </p>
          </div>

          {responsaveis.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="vendedorId">
                Quem vai {ehAtendente && "*"}
              </Label>
              <select
                id="vendedorId"
                name="vendedorId"
                value={quemVai}
                onChange={(e) => setQuemVai(e.target.value)}
                className={SELECT}
              >
                <option value="">
                  {ehAtendente ? "Selecione…" : "Eu mesma"}
                </option>
                {responsaveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={2}
              defaultValue={visita?.observacoes ?? ""}
              placeholder="Ponto de referência, com quem falar, o que levar…"
            />
          </div>

          {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || alvo == null}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Padrão de horário: amanhã às 9h — quase nunca se marca para daqui a 5 min. */
function padraoInicial(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return paraInput(d);
}

/**
 * O que está livre no dia de quem vai.
 *
 * Clicar numa faixa preenche o horário de início — é o gesto que a atendente
 * faz o dia inteiro, e digitar de novo o que acabou de ler só gera erro.
 */
function PainelDaAgenda({
  agenda,
  carregando,
  onEscolher,
}: {
  agenda: DisponibilidadeDoDia | null;
  carregando: boolean;
  onEscolher: (hhmm: string) => void;
}) {
  if (carregando && !agenda) {
    return (
      <p className="text-xs text-muted-foreground">Vendo a agenda do dia…</p>
    );
  }
  if (!agenda) return null;

  if (agenda.estado === "erro") {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
        {agenda.mensagem ?? "Não deu para ver a agenda do Google."} Os horários
        abaixo consideram só as visitas marcadas aqui.
      </p>
    );
  }

  return (
    <div className="rounded-md border bg-secondary/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Horários livres no dia
      </p>
      {agenda.livres.length === 0 ? (
        <p className="mt-1 text-sm text-destructive">
          Nenhum horário livre que caiba nessa duração.
        </p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {agenda.livres.map((faixa) => (
            <button
              key={faixa}
              type="button"
              onClick={() => onEscolher(faixa.slice(0, 5))}
              className="rounded-full border bg-background px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
            >
              {faixa}
            </button>
          ))}
        </div>
      )}

      {agenda.ocupados.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ocupado: {agenda.ocupados.join(" · ")}
        </p>
      )}
      {/* Sem dizer QUANDO nem O QUÊ: só que o buraco na agenda tem dono. */}
      {agenda.temParticularOculto && (
        <p className="mt-1 text-xs text-muted-foreground">
          Há compromissos particulares no dia — eles já saíram dos horários
          livres acima.
        </p>
      )}
      {agenda.estado === "sem_conexao" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Esta pessoa ainda não conectou o Google Agenda: os horários acima
          consideram só as visitas marcadas aqui.
        </p>
      )}
    </div>
  );
}
