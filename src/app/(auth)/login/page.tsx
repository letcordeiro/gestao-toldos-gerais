import { CONTAS_DEMO, ehDemo } from "@/lib/demo";
import { PAPEL_LABEL } from "@/lib/papeis";
import { LoginForm } from "./login-form";

// A flag DEMO é lida no servidor: o formulário é componente de cliente e não
// enxerga process.env.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const contasDemo = ehDemo()
    ? CONTAS_DEMO.map((c) => ({
        papel: c.papel,
        nome: c.nome,
        resumo: c.resumo,
        rotulo: PAPEL_LABEL[c.papel].toLowerCase(),
      }))
    : null;
  return <LoginForm contasDemo={contasDemo} />;
}
