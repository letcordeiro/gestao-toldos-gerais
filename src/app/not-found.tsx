import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Image src="/logo.png" alt="Toldos Gerais" width={100} height={54} />
      <h1 className="text-2xl font-semibold tracking-tight">
        Página não encontrada
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        O endereço pode estar errado ou a página foi movida.
      </p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Ir para o início
      </Link>
    </div>
  );
}
