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
import { Label } from "@/components/ui/label";

type VendedorLink = { id: number; nome: string; token: string };

// Link de cadastro EXCLUSIVO por vendedor: quem entra por ele já vira lead
// daquele vendedor. Vendedor vê o seu; gestor escolhe de quem é o link.
export function GerarLinkDialog({ links }: { links: VendedorLink[] }) {
  const [origin, setOrigin] = useState("");
  const [sel, setSel] = useState<string>(
    links.length ? String(links[0].id) : ""
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const escolhido = links.find((l) => String(l.id) === sel) ?? links[0];
  const url =
    origin && escolhido ? `${origin}/cadastro/${escolhido.token}` : "";
  const multiplos = links.length > 1;

  // Mensagem de primeiro contato: o vendedor se apresenta e pede o cadastro.
  const primeiroNome = escolhido?.nome?.split(" ")[0] ?? "";
  const mensagem =
    `Olá! Aqui é ${primeiroNome}, da Toldos Gerais — vou ser o vendedor responsável pelo seu atendimento. 😊\n\n` +
    `Para eu preparar seu orçamento, é só fazer um cadastro rápido neste link e me contar o que você precisa (medidas, local, tipo de cobertura, etc.):\n${url}\n\n` +
    `Assim que você enviar, já dou início ao seu atendimento. Qualquer dúvida, pode falar comigo por aqui!`;
  const linkWhatsApp = url
    ? `https://wa.me/?text=${encodeURIComponent(mensagem)}`
    : "";

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Link de cadastro
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link de cadastro do cliente</DialogTitle>
          <DialogDescription>
            Cada vendedor tem seu link. Divulgue (WhatsApp, Instagram, etc.): o
            cliente preenche os dados e entra no funil já atribuído ao vendedor.
            Se já for cadastrado, o sistema reconhece pelo telefone e não
            duplica.
          </DialogDescription>
        </DialogHeader>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum vendedor com link disponível. Cadastre um vendedor primeiro.
          </p>
        ) : (
          <div className="space-y-3">
            {multiplos && (
              <div className="space-y-1.5">
                <Label htmlFor="vendLink">Link de qual vendedor?</Label>
                <select
                  id="vendLink"
                  value={sel}
                  onChange={(e) => setSel(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {links.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <Input readOnly value={url} className="text-xs" />
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  toast.success(`Link de ${escolhido.nome} copiado`);
                }}
              >
                Copiar
              </Button>
            </div>
            <Button
              className="w-full"
              nativeButton={false}
              render={
                <a href={linkWhatsApp} target="_blank" rel="noopener" />
              }
            >
              Enviar no WhatsApp
            </Button>
            <p className="text-xs text-muted-foreground">
              Abre o WhatsApp com uma mensagem de primeiro contato pronta (você
              escolhe o cliente e pode editar antes de enviar).
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
