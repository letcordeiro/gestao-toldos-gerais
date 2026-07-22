import "server-only";
import nodemailer from "nodemailer";

// Envio de e-mail transacional via SMTP. Config por env:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM.
// Com Gmail: host smtp.gmail.com, porta 465, user = o e-mail e
// pass = SENHA DE APP (não a senha normal da conta).

export function emailConfigurado(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

export async function enviarEmail({
  para,
  assunto,
  html,
  texto,
}: {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}): Promise<void> {
  if (!emailConfigurado()) {
    throw new Error(
      "Envio de e-mail não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS)."
    );
  }

  const porta = Number(process.env.SMTP_PORT ?? 465);
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    secure: porta === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporte.sendMail({
    from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
    to: para,
    subject: assunto,
    text: texto,
    html,
  });
}

/** Corpo do e-mail de redefinição, na identidade da empresa. */
export function emailRedefinirSenha(link: string): { html: string; texto: string } {
  const texto = [
    "Você pediu para redefinir sua senha do sistema da Toldos Gerais.",
    "",
    "Abra este link para criar uma nova senha:",
    link,
    "",
    "O link vale por 1 hora e só pode ser usado uma vez.",
    "Se não foi você quem pediu, ignore este e-mail — sua senha continua a mesma.",
  ].join("\n");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5;max-width:520px">
    <p style="font-size:16px;margin:0 0 16px">
      Você pediu para redefinir sua senha do <strong>sistema da Toldos Gerais</strong>.
    </p>
    <p style="margin:0 0 24px">Clique no botão abaixo para criar uma nova senha:</p>
    <p style="margin:0 0 24px">
      <a href="${link}"
         style="background:#004E36;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block;font-weight:bold">
        Criar nova senha
      </a>
    </p>
    <p style="margin:0 0 8px;color:#5E7168;font-size:14px">
      O link vale por <strong>1 hora</strong> e só pode ser usado uma vez.
    </p>
    <p style="margin:0 0 24px;color:#5E7168;font-size:14px">
      Se não foi você quem pediu, ignore este e-mail — sua senha continua a mesma.
    </p>
    <p style="margin:0;color:#8a8a8a;font-size:12px;word-break:break-all">
      Se o botão não funcionar, copie este endereço no navegador:<br>${link}
    </p>
  </div>`;

  return { html, texto };
}
