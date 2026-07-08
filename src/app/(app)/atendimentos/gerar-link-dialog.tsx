"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { gerarLinkCadastro } from "./actions";

export function GerarLinkDialog() {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function gerar() {
    startTransition(async () => {
      const { token } = await gerarLinkCadastro();
      setUrl(`${window.location.origin}/cadastro/${token}`);
    });
  }

  return (
    <Dialog onOpenChange={(aberto) => !aberto && setUrl(null)}>
      <DialogTrigger render={<Button variant="outline" />}>
        Gerar link de cadastro
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link de auto-cadastro</DialogTitle>
          <DialogDescription>
            Válido por 7 dias, uso único. O cliente preenche os dados e entra
            direto no funil como “Novo lead”.
          </DialogDescription>
        </DialogHeader>
        {url ? (
          <div className="flex gap-2">
            <Input readOnly value={url} className="text-xs" />
            <Button
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                toast.success("Link copiado");
              }}
            >
              Copiar
            </Button>
          </div>
        ) : (
          <Button onClick={gerar} disabled={pending}>
            {pending ? "Gerando…" : "Gerar novo link"}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Link permanente (sem validade):{" "}
          <span className="font-mono">/cadastro/publico</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
