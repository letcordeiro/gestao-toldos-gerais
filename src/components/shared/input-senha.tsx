"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Campo de senha com botão de mostrar/ocultar. Repassa todas as props do Input.
export function InputSenha({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const [ver, setVer] = React.useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={ver ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
        title={ver ? "Ocultar senha" : "Mostrar senha"}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
      >
        {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
