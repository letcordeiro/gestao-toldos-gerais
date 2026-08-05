"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { mascaraMoeda, parseParaCentavos } from "@/lib/format";
import { podeFazer, type StatusContrato } from "@/lib/contratos";
import {
  cancelarContrato,
  criarNovaVersao,
  emitirContrato,
  gerarAditivo,
  marcarAssinado,
} from "../actions";

export function AcoesContrato({
  contratoId,
  status,
  publicToken,
  urlBase,
}: {
  contratoId: number;
  status: StatusContrato;
  publicToken: string | null;
  urlBase: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendencias, setPendencias] = useState<string[]>([]);
  const [assinarAberto, setAssinarAberto] = useState(false);
  const [aditivoAberto, setAditivoAberto] = useState(false);
  const [dataAssinatura, setDataAssinatura] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [motivo, setMotivo] = useState("");

  const linkPublico = publicToken ? `${urlBase}/contrato/${publicToken}` : null;

  const emitir = () => {
    startTransition(async () => {
      const r = await emitirContrato(contratoId);
      if (r.pendencias?.length) {
        setPendencias(r.pendencias);
        toast.error("Faltam dados para emitir");
        return;
      }
      if (r.erro) {
        toast.error(r.erro);
        return;
      }
      setPendencias([]);
      toast.success("Contrato emitido");
      router.refresh();
    });
  };

  const assinar = () => {
    startTransition(async () => {
      const r = await marcarAssinado(contratoId, dataAssinatura);
      if (r.erro) toast.error(r.erro);
      else {
        toast.success("Assinatura registrada");
        setAssinarAberto(false);
        router.refresh();
      }
    });
  };

  const versionar = () => {
    startTransition(async () => {
      const r = await criarNovaVersao(contratoId);
      if (r.erro) toast.error(r.erro);
      else if (r.novoId) {
        toast.success("Nova versão criada");
        router.push(`/contratos/${r.novoId}`);
      }
    });
  };

  const cancelar = () => {
    startTransition(async () => {
      const r = await cancelarContrato(contratoId, motivo);
      if (r.erro) toast.error(r.erro);
      else {
        toast.success("Contrato cancelado");
        router.refresh();
      }
    });
  };

  const copiarLink = async () => {
    if (!linkPublico) return;
    try {
      await navigator.clipboard.writeText(linkPublico);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar — copie da barra de endereço");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {podeFazer(status, "emitir") && (
          <Button onClick={emitir} disabled={pending}>
            {pending ? "Emitindo…" : "Emitir contrato"}
          </Button>
        )}

        {podeFazer(status, "assinar") && (
          <Dialog open={assinarAberto} onOpenChange={setAssinarAberto}>
            <DialogTrigger render={<Button variant="outline" />}>
              Marcar como assinado
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Registrar assinatura</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dataAssinatura">Data da assinatura</Label>
                  <Input
                    id="dataAssinatura"
                    type="date"
                    value={dataAssinatura}
                    onChange={(e) => setDataAssinatura(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Depois de assinado o contrato não pode mais ser editado nem
                  versionado — mudanças passam a exigir aditivo.
                </p>
                <Button
                  className="w-full"
                  onClick={assinar}
                  disabled={pending}
                >
                  {pending ? "Salvando…" : "Confirmar assinatura"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {podeFazer(status, "versionar") && (
          <Button variant="outline" onClick={versionar} disabled={pending}>
            Nova versão
          </Button>
        )}

        {podeFazer(status, "aditivar") && (
          <Dialog open={aditivoAberto} onOpenChange={setAditivoAberto}>
            <DialogTrigger render={<Button variant="outline" />}>
              Gerar aditivo
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo termo aditivo</DialogTitle>
              </DialogHeader>
              <FormAditivo
                contratoId={contratoId}
                aoConcluir={() => {
                  setAditivoAberto(false);
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href={`/contratos/${contratoId}/imprimir`} />}
        >
          <Printer className="size-4" /> Imprimir
        </Button>

        {/* download no próprio <a>: baixa o arquivo em vez de abrir o
            visualizador de PDF do navegador */}
        <Button
          nativeButton={false}
          variant="outline"
          render={
            <a href={`/contratos/${contratoId}/pdf?download=1`} download />
          }
        >
          <Download className="size-4" /> Baixar PDF
        </Button>

        {linkPublico && (
          <Button variant="outline" onClick={copiarLink}>
            Copiar link
          </Button>
        )}

        {podeFazer(status, "cancelar") && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="ghost" className="text-destructive" />
              }
            >
              Cancelar contrato
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar este contrato?</AlertDialogTitle>
                <AlertDialogDescription>
                  Informe o motivo. Se o contrato já estava assinado, a retenção
                  configurada será calculada e registrada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="motivoCancelamento">Motivo</Label>
                <Textarea
                  id="motivoCancelamento"
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex.: cliente desistiu da obra"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={pending || !motivo.trim()}
                  onClick={cancelar}
                >
                  Cancelar contrato
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {pendencias.length > 0 && (
        <div
          className="rounded-lg border border-destructive bg-destructive/10 p-3"
          role="alert"
        >
          <p className="text-sm font-semibold">
            Faltam {pendencias.length} item(ns) para emitir:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {pendencias.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FormAditivo({
  contratoId,
  aoConcluir,
}: {
  contratoId: number;
  aoConcluir: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [objeto, setObjeto] = useState("");
  const [delta, setDelta] = useState("0,00");
  const [negativo, setNegativo] = useState(false);
  const [novoPrazo, setNovoPrazo] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));

  const enviar = () => {
    const centavos = parseParaCentavos(delta) ?? 0;
    const fd = new FormData();
    fd.set("contratoId", String(contratoId));
    fd.set("objeto", objeto);
    fd.set("deltaValor", String(negativo ? -centavos : centavos));
    if (novoPrazo) fd.set("novoPrazoDiasUteis", novoPrazo);
    fd.set("dataAssinatura", data);
    startTransition(async () => {
      const r = await gerarAditivo({}, fd);
      if (r.erro) toast.error(r.erro);
      else {
        toast.success("Aditivo registrado");
        aoConcluir();
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="objetoAditivo">O que muda *</Label>
        <Textarea
          id="objetoAditivo"
          rows={4}
          value={objeto}
          onChange={(e) => setObjeto(e.target.value)}
          placeholder="Descreva apenas a alteração — ex.: acréscimo de 1 toldo de 2,00 × 1,50 na área de serviço."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="deltaValor">Alteração de valor</Label>
          <div className="flex gap-2">
            <select
              aria-label="Sinal da alteração"
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={negativo ? "-" : "+"}
              onChange={(e) => setNegativo(e.target.value === "-")}
            >
              <option value="+">+</option>
              <option value="-">−</option>
            </select>
            <Input
              id="deltaValor"
              inputMode="decimal"
              value={delta}
              onChange={(e) => setDelta(mascaraMoeda(e.target.value))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="novoPrazo">Novo prazo (dias úteis)</Label>
          <Input
            id="novoPrazo"
            type="number"
            min={0}
            max={365}
            inputMode="numeric"
            value={novoPrazo}
            onChange={(e) => setNovoPrazo(e.target.value)}
            placeholder="deixe vazio para manter"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dataAditivo">Data da assinatura do aditivo</Label>
        <Input
          id="dataAditivo"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>
      <Button
        className="w-full"
        disabled={pending || !objeto.trim()}
        onClick={enviar}
      >
        {pending ? "Salvando…" : "Registrar aditivo"}
      </Button>
    </div>
  );
}
