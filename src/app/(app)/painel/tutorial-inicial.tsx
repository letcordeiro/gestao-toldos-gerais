"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Contact,
  FileText,
  ListChecks,
  PartyPopper,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Passo = {
  icon: LucideIcon;
  titulo: string;
  texto: string;
};

const VERSAO = "v1";

// Tutorial prático mostrado na primeira vez que o usuário entra.
export function TutorialInicial({
  email,
  nome,
  ehGestor,
}: {
  email: string;
  nome: string | null;
  ehGestor: boolean;
}) {
  const chave = `tg_tutorial_${VERSAO}_${email}`;
  const [aberto, setAberto] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(chave)) setAberto(true);
    } catch {
      // sem localStorage: não força o tutorial
    }
  }, [chave]);

  const primeiroNome = (nome ?? "").split(" ")[0];

  const passos = useMemo<Passo[]>(() => {
    const base: Passo[] = [
      {
        icon: PartyPopper,
        titulo: primeiroNome
          ? `Bem-vindo(a), ${primeiroNome}!`
          : "Bem-vindo(a)!",
        texto:
          "Este é o sistema da Toldos Gerais. Em 1 minuto você aprende a usar o dia a dia: atender clientes, montar orçamentos e enviar propostas no WhatsApp.",
      },
      {
        icon: ListChecks,
        titulo: "Atendimentos — seu funil",
        texto:
          "A aba Atendimentos é o coração do sistema. Cada cliente vira um atendimento que caminha pelas fases (Novo lead → Visita → Orçamento → Negociação → Concluído). Troque a fase direto na lista conforme o negócio anda.",
      },
      {
        icon: Contact,
        titulo: "Cadastrar clientes",
        texto:
          "Cadastre o cliente na hora pelo botão de novo atendimento, ou gere um link de cadastro para o próprio cliente preencher os dados. Todo cliente fica ligado a um vendedor responsável.",
      },
      {
        icon: FileText,
        titulo: "Montar o orçamento",
        texto:
          "Na aba Orçamentos você cria a proposta: escolhe o modelo de toldo (os textos preenchem sozinhos), ajusta o que precisar e lança os valores. Salve como rascunho ou já como enviado.",
      },
      {
        icon: Send,
        titulo: "Enviar no WhatsApp",
        texto:
          "Com o orçamento pronto, use o botão de enviar no WhatsApp: o cliente recebe a proposta e pode baixar o PDF. Seus dados de vendedor aparecem no rodapé para o cliente falar direto com você.",
      },
    ];
    if (ehGestor) {
      base.push({
        icon: Users,
        titulo: "Sua equipe",
        texto:
          "Como gestor, na aba Vendedores você cadastra a equipe e copia o link para novos vendedores criarem o próprio acesso. Você vê os atendimentos e orçamentos de todos.",
      });
    }
    return base;
  }, [primeiroNome, ehGestor]);

  const ultimo = i === passos.length - 1;
  const passo = passos[i];
  const Icone = passo.icon;

  function fechar() {
    try {
      localStorage.setItem(chave, new Date().toISOString());
    } catch {
      // ignora
    }
    setAberto(false);
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        if (!v) fechar();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icone className="size-6" />
          </div>
          <DialogTitle>{passo.titulo}</DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            {passo.texto}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-1">
          {passos.map((_, idx) => (
            <span
              key={idx}
              className={
                "h-1.5 rounded-full transition-all " +
                (idx === i ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")
              }
            />
          ))}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={fechar}>
            Pular
          </Button>
          <div className="flex gap-2">
            {i > 0 && (
              <Button variant="outline" onClick={() => setI(i - 1)}>
                Voltar
              </Button>
            )}
            {ultimo ? (
              <Button onClick={fechar}>Começar</Button>
            ) : (
              <Button onClick={() => setI(i + 1)}>Próximo</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
