"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarDocumentoCliente } from "../actions";

/**
 * CPF/CNPJ do cliente — obrigatório para emitir o contrato.
 * Salva sozinho: um instante depois de parar de digitar (e ao sair do campo),
 * sem botão. O estado do salvamento aparece ao lado do rótulo.
 */
export function DocumentoCliente({
  clienteId,
  documentoInicial,
}: {
  clienteId: number;
  documentoInicial: string;
}) {
  const router = useRouter();
  const [documento, setDocumento] = useState(documentoInicial);
  const [estado, setEstado] = useState<"parado" | "salvando" | "salvo" | "erro">(
    "parado"
  );
  // O que já está no banco — evita gravar de novo o mesmo valor.
  const salvoRef = useRef(documentoInicial);

  const salvar = async (valor: string) => {
    if (valor === salvoRef.current) return;
    setEstado("salvando");
    const r = await salvarDocumentoCliente(clienteId, valor);
    if (r.erro) {
      setEstado("erro");
      return;
    }
    salvoRef.current = valor;
    setEstado("salvo");
    // Atualiza a tela: com o documento preenchido, some a pendência de emissão.
    router.refresh();
  };

  // Salva ~800ms depois da última tecla.
  useEffect(() => {
    if (documento === salvoRef.current) return;
    const timer = setTimeout(() => {
      void salvar(documento);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documento]);

  // "Salvo" some depois de um tempo para não virar ruído permanente.
  useEffect(() => {
    if (estado !== "salvo") return;
    const timer = setTimeout(() => setEstado("parado"), 2500);
    return () => clearTimeout(timer);
  }, [estado]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor="documentoCliente">CPF/CNPJ do cliente *</Label>
        <span
          className="flex items-center gap-1 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {estado === "salvando" && (
            <>
              <LoaderCircle className="size-3 animate-spin" aria-hidden />
              salvando…
            </>
          )}
          {estado === "salvo" && (
            <>
              <Check className="size-3 text-primary" aria-hidden />
              salvo
            </>
          )}
          {estado === "erro" && (
            <span className="text-destructive">não salvou — tente de novo</span>
          )}
        </span>
      </div>
      <Input
        id="documentoCliente"
        inputMode="numeric"
        value={documento}
        placeholder="000.000.000-00"
        onChange={(e) => setDocumento(e.target.value)}
        // Sair do campo salva na hora, sem esperar o tempo do debounce.
        onBlur={() => void salvar(documento)}
      />
      {!documentoInicial && (
        <p className="text-xs text-destructive">
          Sem CPF/CNPJ o contrato não pode ser emitido.
        </p>
      )}
    </div>
  );
}
