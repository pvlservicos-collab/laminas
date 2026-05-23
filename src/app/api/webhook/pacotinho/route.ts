import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  // Verificar token secreto
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const token = req.headers.get("x-webhook-secret") || new URL(req.url).searchParams.get("secret");
    if (token !== webhookSecret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  console.log("Webhook Pacotinho recebido:", payload.id, payload.status);

  if (payload.status !== "PAID") {
    return NextResponse.json({ ok: true, message: "Status ignorado" });
  }

  const email = payload.customer?.email;
  const rawName = `${payload.customer?.name || ""} ${payload.customer?.lastname || ""}`.trim();
  const name = rawName.replace(/[<>"'&]/g, "");

  if (!email) {
    return NextResponse.json({ error: "Email não encontrado" }, { status: 400 });
  }

  const pacotinhoUrl = process.env.PACOTINHO_PDF_URL;
  if (!pacotinhoUrl) {
    console.error("PACOTINHO_PDF_URL não configurada");
    return NextResponse.json({ error: "PDF não configurado" }, { status: 500 });
  }

  try {
    // Baixar PDF do Blob
    const pdfRes = await fetch(pacotinhoUrl);
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    // Enviar por email
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Figurinha Copa 2026 <onboarding@resend.dev>",
      to: email,
      subject: "Seu Pacotinho Oficial Copa 2026 chegou! 📦⚽",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1E3A8A; text-align: center;">Pacotinho Oficial Copa 2026! 📦</h1>
          <p style="font-size: 18px; text-align: center;">Olá <strong>${name}</strong>!</p>
          <p style="font-size: 16px; text-align: center;">
            Seu pacotinho oficial para impressão está em anexo.
            Imprima, recorte e monte suas figurinhas!
          </p>
          <p style="font-size: 14px; color: #666; text-align: center;">
            Dica: imprima em papel fotográfico para melhor qualidade!
          </p>
          <hr style="border: 1px solid #FFD700; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            Figurinha Copa 2026 — Pacote para impressão.
          </p>
        </div>
      `,
      attachments: [
        { filename: "pacotinho-oficial-copa-2026.pdf", content: pdfBuffer.toString("base64") },
      ],
    });

    console.log(`Pacotinho enviado para ${email}`);
    return NextResponse.json({ ok: true, message: "Pacotinho enviado" });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Erro ao enviar pacotinho:", errMsg);
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }
}
