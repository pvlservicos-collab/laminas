import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { validateAdminRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pedidoId } = await req.json();
  if (!pedidoId) {
    return NextResponse.json({ error: "pedidoId obrigatório" }, { status: 400 });
  }

  const sql = getDb();
  await sql`UPDATE pedidos SET whats_enviado = TRUE WHERE id = ${pedidoId}`;

  return NextResponse.json({ ok: true });
}
