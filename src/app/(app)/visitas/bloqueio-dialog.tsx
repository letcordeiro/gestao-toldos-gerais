"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { DIAS_SEMANA } from "@/lib/agenda";
import { salvarBloqueio, type BloqueioFormState } from "./bloqueios-actions";

const SELECT =
  "h-10 md:h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

/**
 * Bloquear horário na agenda do próprio sistema (13/10/2026).
 *
 * "Toda semana" é o caso que motivou tudo: a faculdade do João. Cadastra uma
 * vez e a terça/quinta à noite saem dos horários livres de toda semana — sem
 * ninguém precisar travar a agenda de novo a cada sete dias.
 */
export function BloqueioDialog({
  trigger,
  vendedores,
  vendedorFixo,
  hoje,
}: {
  trigger: React.ReactElement<Record<string, unknown>>;
  /** Gestor escolhe de quem é a agenda; vendedor só bloqueia a dele. */
  vendedores: { id: number; nome: string }[];
  vendedorFixo?: { id: number; nome: string };
  /** "aaaa-mm-dd" de hoje em Brasília, para os campos de data. */
  hoje: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [recorrencia, setRecorrencia] = useState<"unico" | "semanal">("semanal");
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [state, formAction, pending] = useActionState<BloqueioFormState, FormData>(
    salvarBloqueio,
    {}
  );

  // Fecha e atualiza a tela ao salvar. Só refresh, sem navegar: fechar o
  // diálogo e trocar de tela juntos é a armadilha descrita no CLAUDE.md.
  useEffect(() => {
    if (!state.ok) return;
    setAberto(false);
    toast.success("Horário bloqueado");
    router.refresh();
  }, [state, router]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="recorrencia" value={recorrencia} />

          <div className="space-y-1.5">
            <Label htmlFor="bloqueio-vendedor">Agenda de</Label>
            {vendedorFixo ? (
              <>
                <input type="hidden" name="vendedorId" value={vendedorFixo.id} />
                <p className="text-sm">{vendedorFixo.nome}</p>
              </>
            ) : (
              <select id="bloqueio-vendedor" name="vendedorId" className={SELECT} required>
                <option value="">Escolha…</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label id="rotulo-recorrencia">Quando</Label>
            <div role="radiogroup" aria-labelledby="rotulo-recorrencia" className="grid grid-cols-2 gap-2">
              {(
                [
                  ["semanal", "Toda semana", "Ex.: faculdade, curso"],
                  ["unico", "Só um dia", "Ex.: médico, folga"],
                ] as const
              ).map(([valor, rotulo, ajuda]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={recorrencia === valor}
                  onClick={() => setRecorrencia(valor)}
                  className={
                    "rounded-md border px-3 py-2 text-left text-sm transition-colors " +
                    (recorrencia === valor
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "hover:bg-secondary")
                  }
                >
                  {rotulo}
                  <span className="block text-xs font-normal text-muted-foreground">{ajuda}</span>
                </button>
              ))}
            </div>
          </div>

          {recorrencia === "semanal" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="bloqueio-dia-semana">Dia</Label>
                <select id="bloqueio-dia-semana" name="diaSemana" className={SELECT} required defaultValue="">
                  <option value="">Escolha…</option>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <option key={d} value={d}>
                      {DIAS_SEMANA[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bloqueio-desde">A partir de</Label>
                <Input id="bloqueio-desde" name="data" type="date" defaultValue={hoje} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bloqueio-ate">Até (opcional)</Label>
                <Input id="bloqueio-ate" name="ate" type="date" />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="bloqueio-data">Dia</Label>
              <Input id="bloqueio-data" name="data" type="date" defaultValue={hoje} required />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="diaInteiro"
              checked={diaInteiro}
              onChange={(e) => setDiaInteiro(e.target.checked)}
              className="size-4"
            />
            Dia inteiro
          </label>
          {!diaInteiro && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bloqueio-inicio">Das</Label>
                <Input id="bloqueio-inicio" name="inicio" type="time" required defaultValue="19:00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bloqueio-fim">Às</Label>
                <Input id="bloqueio-fim" name="fim" type="time" required defaultValue="22:00" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="bloqueio-motivo">Motivo (opcional)</Label>
            <Input id="bloqueio-motivo" name="motivo" maxLength={120} placeholder="Ex.: faculdade" />
            <p className="text-xs text-muted-foreground">
              Só o dono da agenda e o gestor veem o motivo. Para a atendente
              aparece apenas “indisponível”.
            </p>
          </div>

          {state.erro && <p className="text-sm text-destructive">{state.erro}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Bloquear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
