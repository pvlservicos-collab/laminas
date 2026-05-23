import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Rate limiting: 10 req/IP/minuto
const stickerRL = new Map<string, { count: number; resetAt: number }>();
function checkRL(ip: string): boolean {
  const now = Date.now();
  const e = stickerRL.get(ip);
  if (!e || now > e.resetAt) { stickerRL.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRL(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const id    = req.nextUrl.searchParams.get("id");
  const email = req.nextUrl.searchParams.get("email");

  const sql = getDb();
  let rows: Record<string, string>[] = [];

  try {
    if (email) {
      // Aceita telefone (só dígitos) ou email
      const val = email.trim().slice(0, 255);
      const digits = val.replace(/\D/g, "");
      const isPhone = digits.length >= 10 && digits === val;
      if (isPhone) {
        rows = await sql`
          SELECT sticker_url FROM pedidos
          WHERE telefone = ${digits} AND sticker_url IS NOT NULL
          ORDER BY created_at DESC LIMIT 1
        `;
      } else {
        const emailSafe = val.toLowerCase();
        rows = await sql`
          SELECT sticker_url FROM pedidos
          WHERE email = ${emailSafe} AND sticker_url IS NOT NULL
          ORDER BY created_at DESC LIMIT 1
        `;
      }
    } else if (id) {
      if (!/^[0-9a-f-]{36}$/.test(id)) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 });
      }
      rows = await sql`
        SELECT sticker_url FROM pedidos
        WHERE sticker_id = ${id}
        LIMIT 1
      `;
    } else {
      return NextResponse.json({ error: "Informe id ou email" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Erro no banco" }, { status: 500 });
  }

  if (rows.length === 0 || !rows[0].sticker_url) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ url: rows[0].sticker_url });
}
