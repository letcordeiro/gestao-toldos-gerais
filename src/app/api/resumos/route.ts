import { NextResponse } from "next/server";
import { enviarResumosPendentes } from "@/lib/resumo-envio";

// Gatilho externo do resumo por e-mail. Quem chama é o cron da VPS:
//
//   0 7 * * * curl -fsS -X POST https://SEU-DOMINIO/api/resumos \
//     -H "Authorization: Bearer $RESUMO_TOKEN"
//
// A rota decide sozinha se cada resumo já está na hora (frequência), então
// pode ser chamada com folga — chamada a mais não manda e-mail repetido.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const esperado = process.env.RESUMO_TOKEN;
  if (!esperado) {
    return NextResponse.json(
      { erro: "RESUMO_TOKEN não configurado no servidor." },
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Sem comparação de tempo constante aqui de propósito: o token é longo e
  // aleatório, e a rota não expõe nada além de "mandou / não mandou".
  if (token !== esperado) {
    return NextResponse.json({ erro: "Token inválido." }, { status: 401 });
  }

  const resultados = await enviarResumosPendentes();
  return NextResponse.json({
    enviados: resultados.filter((r) => r.enviado).length,
    resultados,
  });
}
