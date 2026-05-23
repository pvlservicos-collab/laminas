import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

const BASE_URL = "https://gerarfigurinhas.vercel.app";
const FOLEM_WEBHOOK = "https://webhook.folemmidia.com/webhook/app";

function formatPhone(telefone: string): string {
  return telefone.replace(/\D/g, "");
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sql = getDb();

  // Pedidos com figurinha gerada, abandonados há >90s, sem recovery enviado
  const pendentes = await sql`
    SELECT id, nome, telefone, sticker_id, preview_url, sticker_url
    FROM pedidos
    WHERE sticker_url IS NOT NULL
      AND telefone IS NOT NULL
      AND abandoned_at IS NOT NULL
      AND abandoned_at < NOW() - INTERVAL '90 seconds'
      AND recovery_whatsapp_sent_at IS NULL
      AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY abandoned_at ASC
    LIMIT 20
  `.catch(() => []);

  console.log(`Recovery WhatsApp: ${pendentes.length} pendentes`);

  let sent = 0;
  for (const p of pendentes) {
    const phone = formatPhone(p.telefone);
    const previewLink = `${BASE_URL}/preview/${p.telefone}`;

    try {
      const res = await fetch(FOLEM_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          nome: p.nome,
          preview_url: p.preview_url || p.sticker_url,
          preview_link: previewLink,
          sticker_id: p.sticker_id,
          evento: "figurinha_preview",
        }),
      });

      if (res.ok) {
        await sql`
          UPDATE pedidos SET recovery_whatsapp_sent_at = NOW()
          WHERE id = ${p.id}
        `.catch(() => {});
        sent++;
        console.log(`Recovery WhatsApp enviado → ${phone} (${p.nome})`);
      } else {
        console.error(`Recovery WhatsApp falhou → ${phone}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(`Recovery WhatsApp erro → ${phone}:`, err);
    }
  }

  return NextResponse.json({ ok: true, processed: pendentes.length, sent });
}
