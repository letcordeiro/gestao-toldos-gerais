"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Passo = {
  // alvo = valor do data-tour do botão a destacar. null = card central (intro/fim).
  alvo: string | null;
  titulo: string;
  texto: string;
};

type Retangulo = { top: number; left: number; width: number; height: number };

const VERSAO = "v2"; // bump = reexibe o tour para quem já viu a versão antiga
const MARGEM = 8; // respiro do recorte ao redor do botão
const ESPACO_BALAO = 14;

// Pega o primeiro elemento VISÍVEL com aquele data-tour (desktop e mobile têm
// os mesmos data-tour; só um está visível por vez).
function alvoVisivel(chave: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${chave}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el;
  }
  return null;
}

export function TutorialInicial({
  email,
  nome,
  ehGestor,
  temPerfil,
}: {
  email: string;
  nome: string | null;
  ehGestor: boolean;
  temPerfil: boolean;
}) {
  const chaveStorage = `tg_tutorial_${VERSAO}_${email}`;
  const [aberto, setAberto] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Retangulo | null>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(chaveStorage)) setAberto(true);
    } catch {
      // sem localStorage: não força o tour
    }
  }, [chaveStorage]);

  const primeiroNome = (nome ?? "").split(" ")[0];

  const passos = useMemo<Passo[]>(() => {
    const lista: Passo[] = [
      {
        alvo: null,
        titulo: primeiroNome
          ? `Bem-vindo(a), ${primeiroNome}!`
          : "Bem-vindo(a)!",
        texto:
          "Vou te mostrar rapidinho onde fica cada botão e pra que serve. Leva menos de 1 minuto — dá pra pular quando quiser.",
      },
      {
        alvo: "inicio",
        titulo: "Voltar ao início",
        texto:
          "Toque na logo a qualquer momento para voltar a esta tela inicial (o painel com os números do seu dia).",
      },
      {
        alvo: "atendimentos",
        titulo: "Atendimentos — seu funil",
        texto:
          "O coração do sistema. Aqui você cadastra um novo atendimento e move cada cliente pelas fases (Novo lead → Visita → Orçamento → Negociação → Concluído). O botão de novo atendimento fica dentro desta tela.",
      },
      {
        alvo: "orcamentos",
        titulo: "Orçamentos",
        texto:
          "Onde você monta a proposta, escolhe o modelo de toldo, lança os valores e envia no WhatsApp. O botão 'Novo orçamento' fica aqui dentro.",
      },
      {
        alvo: "clientes",
        titulo: "Clientes",
        texto:
          "A lista de todos os clientes. Dá pra editar os dados e ativar ou inativar cada um.",
      },
    ];
    if (ehGestor) {
      lista.push({
        alvo: "vendedores",
        titulo: "Vendedores",
        texto:
          "Sua equipe. Aqui você cadastra vendedores e copia o link para eles criarem o próprio acesso ao sistema.",
      });
    }
    if (temPerfil) {
      lista.push({
        alvo: "perfil",
        titulo: "Seu perfil",
        texto:
          "Seu nome, contatos e a troca de senha ficam aqui. É esse dado de vendedor que aparece nos orçamentos que você envia.",
      });
    }
    lista.push({
      alvo: null,
      titulo: "Pronto!",
      texto:
        "É só isso. Se quiser rever, é só me chamar. Bom trabalho — e boas vendas!",
    });
    return lista;
  }, [primeiroNome, ehGestor, temPerfil]);

  // Clampa o índice se a lista mudar de tamanho.
  const idx = Math.min(i, passos.length - 1);
  const passo = passos[idx];
  const ultimo = idx === passos.length - 1;

  // Mede o botão-alvo do passo atual e reage a scroll/resize.
  const alvoAtual = passo?.alvo ?? null;
  useLayoutEffect(() => {
    if (!aberto) return;
    function medir() {
      if (!alvoAtual) {
        setRect(null);
        return;
      }
      const el = alvoVisivel(alvoAtual);
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [aberto, alvoAtual]);

  function fechar() {
    try {
      localStorage.setItem(chaveStorage, new Date().toISOString());
    } catch {
      // ignora
    }
    setAberto(false);
  }

  if (!aberto) return null;

  const temAlvo = Boolean(passo.alvo) && rect != null;

  // Posição do balão: abaixo do alvo, ou acima se não couber (ex.: menu inferior).
  let estiloBalao: React.CSSProperties;
  if (temAlvo && rect) {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const abaixo = rect.top + rect.height / 2 < vh / 2;
    estiloBalao = abaixo
      ? { top: rect.top + rect.height + MARGEM + ESPACO_BALAO }
      : { bottom: vh - rect.top + MARGEM + ESPACO_BALAO };
  } else {
    estiloBalao = { top: "50%", transform: "translateY(-50%)" };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      {temAlvo && rect ? (
        // Spotlight: recorte iluminado sobre o botão + escurecido em volta.
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300"
          style={{
            top: rect.top - MARGEM,
            left: rect.left - MARGEM,
            width: rect.width + MARGEM * 2,
            height: rect.height + MARGEM * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/62" />
      )}

      {/* Balão explicativo */}
      <div
        className="absolute inset-x-3 mx-auto max-w-sm rounded-xl border bg-card p-4 shadow-xl sm:inset-x-0"
        style={estiloBalao}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Passo {idx + 1} de {passos.length}
        </p>
        <h2 className="mt-1 text-base font-semibold">{passo.titulo}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {passo.texto}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={fechar}>
            Pular
          </Button>
          <div className="flex gap-2">
            {idx > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setI(idx - 1)}
              >
                Voltar
              </Button>
            )}
            {ultimo ? (
              <Button size="sm" onClick={fechar}>
                Entendi
              </Button>
            ) : (
              <Button size="sm" onClick={() => setI(idx + 1)}>
                Próximo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
