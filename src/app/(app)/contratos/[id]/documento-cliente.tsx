"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarDocumentoCliente } from "../actions";

/** CPF/CNPJ do cliente — obrigatório para emitir, editável aqui mesmo. */
export function DocumentoCliente({
  clienteId,
  documentoInicial,
}: {
  clienteId: number;
  documentoInicial: string;
}) {
  const router = useRouter();
  const [documento, setDocumento] = useState(documentoInicial);
  const [pending, startTransition] = useTransition();

  const salvar = () => {
    startTransition(async () => {
      const r = await salvarDocumentoCliente(clienteId, documento);
      if (r.erro) toast.error(r.erro);
      else {
        toast.success("CPF/CNPJ salvo");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor="documentoCliente">CPF/CNPJ do cliente *</Label>
      <div className="flex gap-2">
        <Input
          id="documentoCliente"
          inputMode="numeric"
          value={documento}
          placeholder="000.000.000-00"
          onChange={(e) => setDocumento(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending || documento === documentoInicial}
          onClick={salvar}
        >
          {pending ? "…" : "Salvar"}
        </Button>
      </div>
      {!documentoInicial && (
        <p className="text-xs text-destructive">
          Sem CPF/CNPJ o contrato não pode ser emitido.
        </p>
      )}
    </div>
  );
}
