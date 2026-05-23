import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { enviarEmailAbandono } from "@/lib/abandono";

export const maxDuration = 30;

// Chamado internamente pelo app via sendBeacon quando o usuário sai durante o loading
export async function POST(req: NextRequest) {
  let body: { email?: string; nome?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false }, { status: 400 });

  const sql = getDb();

  const rows = await sql`
    SELECT id, nome FROM pedidos
    WHERE email = ${email}
      AND status = 'gerando'
      AND recovery_sent = FALSE
    ORDER BY created_at DESC LIMIT 1
  `.catch(() => []);

  if (rows.length === 0) {
    return NextResponse.json({ ok: false });
  }

  const { id, nome } = rows[0];
  const nomeFinal = body.nome || nome;

  const ok = await enviarEmailAbandono({ email, nome: nomeFinal, tipo: "loading" });

  if (ok) {
    await sql`UPDATE pedidos SET recovery_sent = TRUE, recovery_sent_at = NOW() WHERE id = ${id}`.catch(() => {});
  }

  return NextResponse.json({ ok });
}
