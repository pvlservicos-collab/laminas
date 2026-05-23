// Utilitário compartilhado de e-mails de abandono de carrinho

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gerarfigurinhas.vercel.app";

function htmlLoading(nome: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f4;">
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;padding:32px;">
      <h1 style="color:#000000;text-align:center;font-size:26px;margin:0 0 16px 0;">⚽ Sua figurinha ficou pelo caminho!</h1>
      <p style="font-size:16px;text-align:center;color:#000000;margin:0 0 24px 0;">
        Oi! Voce comecou a criar a figurinha de <strong>${nome}</strong> mas saiu antes de ver o resultado.<br/><br/>
        E so clicar no botao abaixo e refazer — leva menos de 1 minuto!
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${BASE_URL}" style="display:inline-block;background:#000000;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:1px;">
          CRIAR MINHA FIGURINHA
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;"/>
      <p style="font-size:12px;text-align:center;color:#999999;margin:0;">${BASE_URL.replace("https://", "")}</p>
    </div>
  </body></html>`;
}

function htmlPreview(nome: string, previewUrl: string, stickerId: string): string {
  const linkVer = `${BASE_URL}/preview?img=${encodeURIComponent(previewUrl)}&nome=${encodeURIComponent(nome)}&id=${stickerId}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f4;">
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;padding:32px;">
      <h1 style="color:#000000;text-align:center;font-size:26px;margin:0 0 16px 0;">⚽ Sua figurinha ainda esta aqui!</h1>
      <p style="font-size:16px;text-align:center;color:#000000;margin:0 0 20px 0;">
        A figurinha de <strong>${nome}</strong> foi gerada e esta esperando por voce.
      </p>
      <div style="text-align:center;margin:20px 0;">
        <img src="${previewUrl}" width="160" height="240" alt="Sua figurinha" style="border-radius:8px;border:2px solid #e0e0e0;display:block;margin:0 auto;"/>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${linkVer}" style="display:inline-block;background:#000000;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:1px;">
          QUERO MINHA FIGURINHA
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;"/>
      <p style="font-size:12px;text-align:center;color:#999999;margin:0;">
        <a href="${BASE_URL}" style="color:#999999;">Criar nova figurinha</a>
      </p>
    </div>
  </body></html>`;
}

export async function enviarEmailAbandono(params: {
  email: string;
  nome: string;
  tipo: "loading" | "preview";
  previewUrl?: string;
  stickerId?: string;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  const { email, nome, tipo, previewUrl, stickerId } = params;

  const html = tipo === "loading"
    ? htmlLoading(nome)
    : htmlPreview(nome, previewUrl!, stickerId!);

  const subject = tipo === "loading"
    ? `Sua figurinha da Copa ficou pelo caminho, ${nome.split(" ")[0]}!`
    : `A figurinha de ${nome} está prestes a ser excluída!`;

  // 1. Resend (domínio verificado — principal)
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM || "Figurinha Copa 2026 <onboarding@resend.dev>";
      await resend.emails.send({ from, to: email, subject, html });
      return true;
    } catch (err) {
      console.error("Resend abandono falhou:", err instanceof Error ? err.message : err);
    }
  }

  // 2. Gmail SMTP (fallback)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const t = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await t.sendMail({ from: `Figurinha Copa 2026 <${process.env.SMTP_USER}>`, to: email, subject, html });
      return true;
    } catch (err) {
      console.error("Gmail abandono falhou:", err instanceof Error ? err.message : err);
    }
  }

  return false;
}
