"use client";

/**
 * Erro no próprio layout raiz — o `error.tsx` não alcança esse caso, e o Next
 * mostrava a página padrão em inglês. Sem Tailwind garantido aqui (o layout
 * caiu), então o estilo vai inline.
 */
export default function ErroGeral({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 20 }}>O sistema teve um problema ao abrir</h1>
        <p style={{ color: "#555" }}>
          Tente de novo. Se continuar, mande um print desta tela para a Letícia.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 12, padding: "8px 16px", background: "#004E36", color: "#fff", border: 0, borderRadius: 6 }}
        >
          Tentar de novo
        </button>
        {error.digest && (
          <p style={{ marginTop: 16, fontSize: 11, color: "#888" }}>código do erro: {error.digest}</p>
        )}
      </body>
    </html>
  );
}
