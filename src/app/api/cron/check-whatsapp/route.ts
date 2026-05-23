import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isZapiEnabled, enviarWhatsApp } from "@/lib/zapi";
import type { ZapiMaterial } from "@/lib/zapi";
import { list } from "@vercel/blob";

export const maxDuration = 120;

const ALERT_PHONE = "5535988366426";

async function sendAlert(message: string) {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  if (!instanceId || !token) return;

  await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientToken ? { "Client-Token": clientToken } : {}),
    },
    body: JSON.stringify({ phone: ALERT_PHONE, message }),
  });
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sql = getDb();

  // Buscar clientes que compraram WhatsApp, pagaram, mas não receberam
  // Só pega pedidos com mais de 5 minutos (dar tempo do webhook processar)
  const pendentes = await sql`
    SELECT DISTINCT p.id, p.nome, p.email, p.telefone, p.sticker_url, p.pdf_url
    FROM pedidos p
    JOIN pedido_items pi ON pi.email = p.email
    WHERE pi.item_type = 'order_bump'
      AND pi.product_name LIKE '%What%'
      AND p.sticker_url IS NOT NULL
      AND p.status IN ('pago', 'entregue', 'recuperado')
      AND COALESCE(p.whats_enviado, FALSE) = FALSE
      AND p.telefone IS NOT NULL
      AND p.paid_at < NOW() - INTERVAL '5 minutes'
    ORDER BY p.id DESC
    LIMIT 10
  `;

  console.log(`Check WhatsApp: ${pendentes.length} pendentes encontrados`);

  if (pendentes.length === 0) {
    return NextResponse.json({ ok: true, pendentes: 0, enviados: 0 });
  }

  // Alertar admin
  const nomes = pendentes.map((p: Record<string, string>) => p.nome).join(", ");
  await sendAlert(`⚠️ WhatsApp pendente detectado!\n\n${pendentes.length} cliente(s) compraram envio no WhatsApp mas não receberam:\n\n${nomes}\n\nTentando reenviar automaticamente...`);

  let enviados = 0;

  if (!isZapiEnabled()) {
    console.error("Z-API não configurada, não pode reenviar");
    return NextResponse.json({ ok: true, pendentes: pendentes.length, enviados: 0, error: "Z-API não configurada" });
  }

  for (const p of pendentes) {
    try {
      const materiais: ZapiMaterial[] = [];
      if (p.sticker_url) materiais.push({ tipo: "figurinha", url: p.sticker_url });
      if (p.pdf_url) materiais.push({ tipo: "pdf", url: p.pdf_url, nome: `figurinhas-${p.nome.toLowerCase().replace(/\s+/g, "-")}` });

      // Verificar order bumps adicionais
      const bumps = await sql`SELECT product_name FROM pedido_items WHERE email = ${p.email} AND item_type = 'order_bump'`.catch(() => []);
      const bNames = bumps.map((b: Record<string, string>) => (b.product_name || "").toLowerCase());
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gerarfigurinhas.vercel.app";

      if (bNames.some((n: string) => n.includes("pacot") || n.includes("impressa"))) {
        materiais.push({ tipo: "pacotinho", url: `${appUrl}/pacotinho-copa-2026.pdf` });
      }
      if (bNames.some((n: string) => n.includes("poster"))) {
        const posterBlobs = await list({ prefix: `posters/` }).catch(() => ({ blobs: [] }));
        const sid = p.sticker_url?.split("/").pop()?.replace(".png", "") || "";
        const pb = posterBlobs.blobs.find((b: { pathname: string }) => b.pathname.includes(sid));
        if (pb) materiais.push({ tipo: "poster", url: pb.url });
      }

      const enviado = await enviarWhatsApp(p.telefone, p.nome, materiais);
      if (enviado) {
        await sql`UPDATE pedidos SET whats_pendente = TRUE, whats_enviado = TRUE WHERE id = ${p.id}`;
        enviados++;
        console.log(`Reenvio WhatsApp OK: ${p.nome} (${p.telefone})`);
      } else {
        console.error(`Reenvio WhatsApp FALHOU: ${p.nome} (${p.telefone})`);
      }

      // Delay entre envios
      await new Promise(r => setTimeout(r, 30000));
    } catch (err) {
      console.error(`Erro reenvio ${p.nome}:`, err);
    }
  }

  if (enviados > 0) {
    await sendAlert(`✅ Reenvio WhatsApp concluído!\n\n${enviados}/${pendentes.length} enviados com sucesso.`);
  }

  return NextResponse.json({ ok: true, pendentes: pendentes.length, enviados });
}
