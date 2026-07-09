"use client";

import { useEffect, useState } from "react";
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

// Link único e permanente de auto-cadastro, o mesmo para todos os clientes.
// O formulário identifica automaticamente se a pessoa já está cadastrada.
export function GerarLinkDialog() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/cadastro/publico`);
  }, []);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Link de cadastro
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link de cadastro do cliente</DialogTitle>
          <DialogDescription>
            Link único para divulgar (WhatsApp, Instagram, etc.). Serve para
            todos: o cliente preenche os dados e entra no funil como “Novo
            lead”. Se já for cadastrado, o sistema reconhece pelo telefone e não
            duplica.
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
