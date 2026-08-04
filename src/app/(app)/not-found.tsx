import Link from "next/link";

// 404 dentro da área logada: mantém o cabeçalho e fala a língua do usuário.
export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Página não encontrada
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        O endereço pode estar errado ou o item foi removido.
      </p>
      <Link
        href="/atendimentos"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Voltar para Atendimentos
      </Link>
    </div>
  );
}
