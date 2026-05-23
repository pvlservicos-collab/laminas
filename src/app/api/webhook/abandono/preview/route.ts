import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { enviarEmailAbandono } from "@/lib/abandono";

// Webhook: pessoa gerou a figurinha mas não comprou (saiu na tela de preview)
// POST { email } ou { email, sticker_id }
export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qSecret = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qSecret !== secret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: Record<string, any>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // Tenta todos os campos possíveis onde o email pode estar (OnProfit legado, novo, genérico)
  const emailRaw =
    body.email ||
    body.user_email ||
    body.customer?.email ||
    body.buyer?.email ||
    body.order_email ||
    null;
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : null;
  if (!email) return NextResponse.json({ error: "email obrigatório" }, { status: 400 });

  const sql = getDb();
  const stickerId = body.sticker_id || body.order_src || body.src;

  // Busca pedido pendente com figurinha, sem recovery enviado
  const rows = await sql`
    SELECT id, nome, sticker_id, preview_url, sticker_url FROM pedidos
    WHERE email = ${email}
      AND status = 'pendente'
      AND sticker_url IS NOT NULL
      AND recovery_sent = FALSE
      ${stickerId ? sql`AND sticker_id = ${stickerId}` : sql``}
    ORDER BY created_at DESC LIMIT 1
  `.catch(() => []);

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, msg: "Nenhum pedido pendente encontrado ou já enviado" });
  }

  const { id, nome, sticker_id, preview_url, sticker_url } = rows[0];

  const ok = await enviarEmailAbandono({
    email,
    nome,
    tipo: "preview",
    previewUrl: preview_url || sticker_url,
    stickerId: sticker_id,
  });

  if (ok) {
    await sql`UPDATE pedidos SET recovery_sent = TRUE, recovery_sent_at = NOW(), status = 'recuperacao' WHERE id = ${id}`.catch(() => {});
  }

  return NextResponse.json({ ok, email, nome, stickerId: sticker_id });
}
