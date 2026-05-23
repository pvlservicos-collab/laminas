import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  // Proteger com token
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || token !== adminToken) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sql = getDb();
  const rows = await sql`SELECT id, nome, sticker_id, status, created_at, paid_at, delivered_at FROM pedidos ORDER BY id DESC LIMIT 50`;
  return NextResponse.json({ pedidos: rows });
}
