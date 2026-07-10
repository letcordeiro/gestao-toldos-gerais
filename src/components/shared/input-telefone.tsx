"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { mascaraTelefone } from "@/lib/format";

// Input de telefone/WhatsApp com máscara (xx)xxxxx-xxxx aplicada ao digitar.
export function InputTelefone({
  name,
  id,
  defaultValue,
  placeholder = "(31)99999-9999",
  required,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  const [valor, setValor] = useState(mascaraTelefone(defaultValue ?? ""));
  return (
    <Input
      id={id}
      name={name}
      value={valor}
      type="tel"
      inputMode="tel"
      required={required}
      placeholder={placeholder}
      onChange={(e) => setValor(mascaraTelefone(e.target.value))}
    />
  );
}
