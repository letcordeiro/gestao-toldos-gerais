import { timingSafeEqual } from "node:crypto";
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
  // Comparação em tempo constante: a rota agora é pública no middleware (o
  // cron chama sem cookie), então o token é a única porta.
  const a = Buffer.from(token);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ erro: "Token inválido." }, { status: 401 });
  }

  const resultados = await enviarResumosPendentes();
  // Sem SMTP nada sai: devolve 503 para o `curl -f` do cron ACUSAR. Com 200 o
  // cron terminava "com sucesso" e ninguém ficava sabendo.
  const semSmtp = resultados.some((r) => r.motivo === "SMTP não configurado");
  return NextResponse.json(
    { enviados: resultados.filter((r) => r.enviado).length, resultados },
    { status: semSmtp ? 503 : 200 }
  );
}
