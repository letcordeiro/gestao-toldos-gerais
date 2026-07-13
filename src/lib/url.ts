import { headers } from "next/headers";

// URL base pública do sistema (ex.: https://toldos.bionatural.tech).
//
// Prioriza APP_URL (fixa, configurada no deploy) para NÃO depender do header
// da requisição — atrás do proxy o "Host" às vezes chega como "localhost", o
// que quebrava os links enviados ao cliente. Se APP_URL não estiver definida
// (dev local), cai para os headers de forwarding e, por fim, o host da request.
export async function urlBase(): Promise<string | null> {
  const configurada = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (configurada) return configurada;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
