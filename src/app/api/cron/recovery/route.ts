import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { enviarEmailAbandono } from "@/lib/abandono";

export const maxDuration = 60;

const BASE_URL = "https://gerarfigurinhas.vercel.app";

export async function GET(req: NextRequest) {
  // Proteger com token (mesmo do cron da Vercel)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sql = getDb();
  const gmailScriptUrl = process.env.GMAIL_SCRIPT_URL;
  if (!gmailScriptUrl) {
    return NextResponse.json({ error: "Gmail Script não configurado" }, { status: 500 });
  }

  // Pedidos pendentes (+1h sem pagar) — tem figurinha, manda preview com desconto
  const pendentes = await sql`
    SELECT id, nome, email, sticker_id, sticker_url, preview_url
    FROM pedidos
    WHERE status = 'pendente'
      AND email IS NOT NULL
      AND sticker_url IS NOT NULL
      AND recovery_sent = FALSE
      AND created_at < NOW() - INTERVAL '1 hour'
      AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at ASC
    LIMIT 10
  `;

  console.log(`Recovery: ${pendentes.length} pendentes`);

  let sent = 0;
  for (const pedido of pendentes) {
    const ok = await enviarEmailAbandono({
      email: pedido.email,
      nome: pedido.nome,
      tipo: "preview",
      previewUrl: pedido.preview_url || pedido.sticker_url,
      stickerId: pedido.sticker_id,
    });
    if (ok) {
      await sql`UPDATE pedidos SET recovery_sent = TRUE, recovery_sent_at = NOW(), status = 'recuperacao' WHERE id = ${pedido.id}`.catch(() => {});
      sent++;
      console.log(`Recovery (preview) → ${pedido.email}`);
    }
  }

  return NextResponse.json({ ok: true, processed: pendentes.length, sent });
}
