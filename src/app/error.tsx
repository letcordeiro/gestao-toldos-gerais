"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Erro inesperado de qualquer tela.
 *
 * Sem este arquivo o Next mostrava a própria página de erro, em inglês
 * ("Application error: a server-side exception has occurred") — foi o que o
 * João viu no dia das fotos grandes demais (31/08/2026), sem saber o que fazer.
 * Aqui a pessoa tem as duas saídas que resolvem quase tudo: tentar de novo e
 * voltar ao início. O código do erro (`digest`) aparece pequeno porque é ele
 * que casa com o log do servidor quando alguém manda print.
 */
export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <Image src="/logo.png" alt="Toldos Gerais" width={100} height={54} />
      <h1 className="text-xl font-semibold tracking-tight">
        Algo não saiu como devia nesta tela
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        O que você já tinha salvo continua salvo. Tente de novo — se o erro
        voltar, mande um print desta tela para a Letícia.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Tentar de novo
        </button>
        <Link
          href="/painel"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Voltar ao início
        </Link>
      </div>
      {error.digest && (
        <p className="text-[11px] text-muted-foreground">
          código do erro: {error.digest}
        </p>
      )}
    </div>
  );
}
