// Feedback imediato entre páginas — evita a sensação de clique sem resposta
// enquanto o servidor monta a tela.
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div
          className="size-8 animate-spin rounded-full border-[3px] border-secondary border-t-primary"
          aria-hidden
        />
        <span className="text-sm">Carregando…</span>
      </div>
    </div>
  );
}
