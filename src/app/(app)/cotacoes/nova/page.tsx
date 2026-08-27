import Link from "next/link";
import { exigirComercial } from "@/lib/auth";
import { CotacaoForm } from "../cotacao-form";
import { fornecedoresAtivos, orcamentosParaCotacao } from "../consulta";

export const metadata = { title: "Nova cotação" };

export default async function NovaCotacaoPage() {
  await exigirComercial();
  const [fornecedores, orcamentos] = await Promise.all([
    fornecedoresAtivos(),
    orcamentosParaCotacao(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link
          href="/cotacoes"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Cotações
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Nova cotação</h1>
      </div>
      <CotacaoForm fornecedores={fornecedores} orcamentos={orcamentos} />
    </div>
  );
}
