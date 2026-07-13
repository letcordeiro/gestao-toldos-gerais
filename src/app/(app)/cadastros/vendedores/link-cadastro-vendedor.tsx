"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mostra o link de auto-cadastro de vendedor para o gestor copiar/enviar.
export function LinkCadastroVendedor({ token }: { token: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const url = origin ? `${origin}/cadastro-vendedor/${token}` : "";
  const mensagem =
    `Olá! Faça seu cadastro de vendedor da Toldos Gerais neste link ` +
    `(você define sua senha e já entra no sistema):\n${url}`;
  const whats = url
    ? `https://wa.me/?text=${encodeURIComponent(mensagem)}`
    : "";

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">Link de cadastro de vendedores</p>
      <p className="mb-2 text-xs text-muted-foreground">
        Envie para um vendedor criar o próprio acesso (nome, contato, e-mail e
        senha). Ele já entra logado.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input readOnly value={url} className="min-w-[12rem] flex-1 text-xs" />
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            toast.success("Link copiado");
          }}
        >
          Copiar
        </Button>
        <Button
          nativeButton={false}
          render={<a href={whats} target="_blank" rel="noopener" />}
        >
          Enviar no WhatsApp
        </Button>
      </div>
    </div>
  );
}
