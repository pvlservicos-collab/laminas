import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const ALERT_PHONE = "5535988366426";
const ALERT_THRESHOLD = 10; // Alertar quando créditos < $10

async function sendWhatsAppAlert(message: string) {
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

async function checkOpenAIBalance(apiKey: string, keyName: string): Promise<{ balance: number; alert: boolean }> {
  try {
    // Verificar billing/credits da OpenAI
    const res = await fetch("https://api.openai.com/v1/organization/costs?start_time=" + Math.floor(Date.now() / 1000 - 86400) + "&end_time=" + Math.floor(Date.now() / 1000), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.status === 401 || res.status === 403) {
      return { balance: -1, alert: true };
    }

    // Tentar endpoint de billing
    const billingRes = await fetch("https://api.openai.com/dashboard/billing/credit_grants", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (billingRes.ok) {
      const data = await billingRes.json();
      const balance = data.total_available || 0;
      return { balance, alert: balance < ALERT_THRESHOLD };
    }

    // Se não conseguir checar billing, faz um teste simples
    const testRes = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (testRes.status === 429) {
      return { balance: 0, alert: true };
    }

    return { balance: -1, alert: false }; // Não conseguiu verificar, mas API funciona
  } catch {
    return { balance: -1, alert: true };
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const keys: { name: string; key: string }[] = [];
  if (process.env.OPENAI_API_KEY) keys.push({ name: "Key 1 (principal)", key: process.env.OPENAI_API_KEY });
  if (process.env.OPENAI_API_KEY_2) keys.push({ name: "Key 2 (backup)", key: process.env.OPENAI_API_KEY_2 });
  if (process.env.OPENAI_API_KEY_3) keys.push({ name: "Key 3 (backup)", key: process.env.OPENAI_API_KEY_3 });

  const results: { name: string; balance: number; alert: boolean }[] = [];
  let alertMessage = "";

  for (const k of keys) {
    const result = await checkOpenAIBalance(k.key, k.name);
    results.push({ name: k.name, ...result });

    if (result.alert) {
      if (result.balance === 0) {
        alertMessage += `⚠️ ${k.name}: SEM CREDITOS!\n`;
      } else if (result.balance > 0) {
        alertMessage += `⚠️ ${k.name}: $${result.balance.toFixed(2)} restantes (abaixo de $${ALERT_THRESHOLD})\n`;
      } else {
        alertMessage += `⚠️ ${k.name}: Nao foi possivel verificar saldo\n`;
      }
    }
  }

  if (alertMessage) {
    const fullMessage = `🚨 ALERTA CREDITOS OPENAI 🚨\n\n${alertMessage}\nAcesse: https://platform.openai.com/settings/organization/billing\n\nFigurinha Copa 2026`;
    await sendWhatsAppAlert(fullMessage);
    console.log("Alerta de creditos enviado via WhatsApp");
  } else {
    console.log("Creditos OK:", results.map(r => `${r.name}: $${r.balance}`).join(", "));
  }

  return NextResponse.json({ ok: true, results });
}
