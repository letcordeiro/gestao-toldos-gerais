import { desc } from "drizzle-orm";
import { db } from "@/db";
import { contratos, orcamentos } from "@/db/schema";
import { exigirGestor } from "@/lib/auth";
import { configNumeracao } from "@/lib/numeracao-consulta";
import { NumeracaoForm } from "./numeracao-form";

export const metadata = { title: "Numerações" };

export default async function NumeracoesPage() {
  await exigirGestor();

  const [orcConfig, ctConfig] = await Promise.all([
    configNumeracao("orcamento"),
    configNumeracao("contrato"),
  ]);

  const ultimoOrc = await db
    .select({ numero: orcamentos.numero })
    .from(orcamentos)
    .orderBy(desc(orcamentos.id))
    .limit(1);
  const ultimoCt = await db
    .select({ numero: contratos.numero })
    .from(contratos)
    .orderBy(desc(contratos.id))
    .limit(1);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Numerações</h1>
        <p className="text-sm text-muted-foreground">
          Como cada documento é numerado. O sequencial continua saindo dos
          números que já existem — mudar o formato aqui começa uma contagem
          nova, e os documentos antigos guardam o número que receberam.
        </p>
      </div>

      <NumeracaoForm
        documento="orcamento"
        prefixo={orcConfig.prefixo}
        incluiAno={orcConfig.incluiAno}
        digitos={orcConfig.digitos}
        ultimoUsado={ultimoOrc[0]?.numero ?? null}
      />
      <NumeracaoForm
        documento="contrato"
        prefixo={ctConfig.prefixo}
        incluiAno={ctConfig.incluiAno}
        digitos={ctConfig.digitos}
        ultimoUsado={ultimoCt[0]?.numero ?? null}
      />
    </div>
  );
}
