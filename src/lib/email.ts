// Módulo centralizado de envio de email
// Ordem: Resend (principal) → Hostinger SMTP (fallback) → Gmail SMTP (último recurso)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gerarfigurinhas.vercel.app";

function buildEmailHtml(customerName: string, pdfUrl?: string, stickerUrl?: string): string {
  const dlPng = stickerUrl ? `${APP_URL}/api/download?url=${encodeURIComponent(stickerUrl)}&name=minha-figurinha-copa2026.png` : "";
  const dlPdf = pdfUrl ? `${APP_URL}/api/download?url=${encodeURIComponent(pdfUrl)}&name=figurinhas-impressao-copa2026.pdf` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f4;">
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;padding:32px;">
      <h1 style="color:#000000;font-size:32px;margin:0 0 8px 0;text-align:center;">SUA FIGURINHA CHEGOOOL!⚽</h1>
      <p style="font-size:18px;color:#000000;margin:0 0 8px 0;text-align:center;">Ola, <strong>${customerName}</strong>!</p>
      <p style="font-size:16px;color:#000000;margin:0 0 24px 0;text-align:center;">Sua figurinha personalizada da Copa do Mundo 2026 esta pronta!</p>
      <div style="text-align:center;margin-bottom:12px;">
        ${dlPng ? `<a href="${dlPng}" style="display:inline-block;background:#000000;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:1px;margin-bottom:12px;">BAIXAR FIGURINHA</a>` : ""}
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        ${dlPdf ? `<a href="${dlPdf}" style="display:inline-block;background:#ffffff;color:#000000;font-weight:bold;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:1px;border:2px solid #000000;">BAIXAR PDF PARA IMPRESSÃO</a>` : ""}
      </div>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
      <p style="font-size:15px;color:#000000;margin:0 0 16px 0;text-align:center;">Conhece alguem que ia amar ter uma figurinha personalizada?</p>
      <div style="text-align:center;">
        <a href="${APP_URL}/" style="display:inline-block;background:#000000;color:#ffffff;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">CRIAR NOVA FIGURINHA</a>
      </div>
      <p style="font-size:12px;color:#999999;margin:24px 0 0 0;text-align:center;">Figurinha Copa 2026 — Arquivo digital para impressao.</p>
    </div>
  </body></html>`;
}

export async function sendEmail(
  to: string,
  customerName: string,
  stickerBytes: Uint8Array,
  pdfBuffer: Buffer,
  pdfUrl?: string,
  stickerUrl?: string
): Promise<boolean> {
  const fileNameBase = customerName.toLowerCase().replace(/\s+/g, "-");
  const subject = "Sua Figurinha da Copa 2026 esta pronta! ⚽";
  const html = buildEmailHtml(customerName, pdfUrl, stickerUrl);
  const resendFrom = process.env.RESEND_FROM_EMAIL || "Figurinha Copa 2026 <onboarding@resend.dev>";

  // 1. Resend (principal)
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: resendFrom,
        to,
        subject,
        html,
        attachments: [
          { filename: `figurinha-${fileNameBase}.png`, content: Buffer.from(stickerBytes).toString("base64") },
          { filename: `figurinhas-impressao-${fileNameBase}.pdf`, content: pdfBuffer.toString("base64") },
        ],
      });
      console.log(`Email enviado via Resend para ${to}`);
      return true;
    } catch (err) {
      console.error("Resend falhou:", err instanceof Error ? err.message : err);
    }
  }

  // 2. Hostinger SMTP (fallback)
  if (process.env.HOSTINGER_SMTP_HOST && process.env.HOSTINGER_SMTP_USER) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: process.env.HOSTINGER_SMTP_HOST,
        port: Number(process.env.HOSTINGER_SMTP_PORT) || 465,
        secure: true,
        auth: { user: process.env.HOSTINGER_SMTP_USER, pass: process.env.HOSTINGER_SMTP_PASS },
      });
      await transporter.sendMail({
        from: `Figurinha Copa 2026 <${process.env.HOSTINGER_SMTP_USER}>`,
        to,
        bcc: process.env.HOSTINGER_SMTP_USER,
        subject,
        html,
        attachments: [
          { filename: `figurinha-${fileNameBase}.png`, content: Buffer.from(stickerBytes) },
          { filename: `figurinhas-impressao-${fileNameBase}.pdf`, content: pdfBuffer },
        ],
      });
      console.log(`Email enviado via Hostinger para ${to}`);
      return true;
    } catch (err) {
      console.error("Hostinger falhou:", err instanceof Error ? err.message : err);
    }
  }

  // 3. Gmail SMTP (último recurso)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `Figurinha Copa 2026 <${process.env.SMTP_USER}>`,
        to,
        bcc: process.env.HOSTINGER_SMTP_USER || process.env.SMTP_USER,
        subject,
        html,
        attachments: [
          { filename: `figurinha-${fileNameBase}.png`, content: Buffer.from(stickerBytes) },
          { filename: `figurinhas-impressao-${fileNameBase}.pdf`, content: pdfBuffer },
        ],
      });
      console.log(`Email enviado via Gmail para ${to}`);
      return true;
    } catch (err) {
      console.error("Gmail falhou:", err instanceof Error ? err.message : err);
    }
  }

  console.error(`FALHA TOTAL: nenhum metodo de envio funcionou para ${to}`);
  return false;
}
