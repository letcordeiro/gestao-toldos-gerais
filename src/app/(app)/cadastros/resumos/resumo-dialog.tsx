"use client";

import { useActionState, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
import {
  BLOCOS,
  FREQUENCIA_LABEL,
  MAX_DESTINATARIOS,
  type Bloco,
  type Destinatario,
  type Frequencia,
  type TipoDestinatario,
} from "@/lib/resumo";
import { salvarResumo, type ResumoFormState } from "./actions";

const SELECT_CLASSES =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const TIPO_LABEL: Record<TipoDestinatario, string> = {
  para: "Para",
  copia: "Cópia",
  oculta: "Cópia oculta",
};

export type ResumoEdicao = {
  id: number;
  nome: string;
  frequencia: Frequencia;
  blocos: Bloco[];
  destinatarios: Destinatario[];
  mensagem: string | null;
};

export function ResumoDialog({
  resumo,
  trigger,
}: {
  resumo?: ResumoEdicao;
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState<Destinatario[]>(
    resumo?.destinatarios ?? []
  );
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<TipoDestinatario>("para");
  const [state, formAction, pending] = useActionState<ResumoFormState, FormData>(
    salvarResumo,
    {}
  );

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  function adicionar() {
    const limpo = email.trim();
    if (!limpo || lista.length >= MAX_DESTINATARIOS) return;
    if (lista.some((d) => d.email.toLowerCase() === limpo.toLowerCase())) return;
    setLista((l) => [...l, { email: limpo, tipo }]);
    setEmail("");
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{resumo ? "Editar resumo" : "Novo resumo"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {resumo && <input type="hidden" name="id" value={resumo.id} />}
          <input
            type="hidden"
            name="destinatarios"
            value={JSON.stringify(lista)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                name="nome"
                defaultValue={resumo?.nome}
                placeholder="Ex.: Resumo da manhã"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frequencia">Frequência *</Label>
              <select
                id="frequencia"
                name="frequencia"
                defaultValue={resumo?.frequencia ?? "diario"}
                className={SELECT_CLASSES}
              >
                {Object.entries(FREQUENCIA_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="space-y-2 rounded-lg border p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              O que vai no e-mail
            </legend>
            {BLOCOS.map((b) => (
              <label key={b.chave} className="flex cursor-pointer gap-2.5">
                <input
                  type="checkbox"
                  name="blocos"
                  value={b.chave}
                  defaultChecked={resumo?.blocos.includes(b.chave) ?? true}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span>
                  <span className="block text-sm font-medium">{b.nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    {b.ajuda}
                  </span>
                </span>
              </label>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Bloco sem nada a dizer não aparece no e-mail.
            </p>
          </fieldset>

          <fieldset className="space-y-2 rounded-lg border p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quem recebe (até {MAX_DESTINATARIOS})
            </legend>
            {lista.length > 0 && (
              <ul className="space-y-1">
                {lista.map((d, i) => (
                  <li
                    key={d.email}
                    className="flex items-center justify-between gap-2 rounded-md bg-secondary px-2 py-1 text-sm"
                  >
                    <span className="truncate">
                      {d.email}{" "}
                      <span className="text-muted-foreground">
                        · {TIPO_LABEL[d.tipo]}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remover ${d.email}`}
                      onClick={() =>
                        setLista((l) => l.filter((_, idx) => idx !== i))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {lista.length < MAX_DESTINATARIOS && (
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  placeholder="email@exemplo.com"
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter aqui adiciona o e-mail; nunca envia o formulário.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionar();
                    }
                  }}
                />
                <select
                  aria-label="Tipo do destinatário"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoDestinatario)}
                  className={SELECT_CLASSES + " w-36"}
                >
                  {Object.entries(TIPO_LABEL).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={adicionar}>
                  Incluir
                </Button>
              </div>
            )}
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="mensagem">Recado no topo do e-mail</Label>
            <Textarea
              id="mensagem"
              name="mensagem"
              rows={2}
              defaultValue={resumo?.mensagem ?? ""}
              placeholder="Opcional"
            />
          </div>

          {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
