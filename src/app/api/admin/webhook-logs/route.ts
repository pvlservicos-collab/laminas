import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { validateAdminRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const logs = await sql`SELECT id, payload, created_at FROM webhook_logs ORDER BY id DESC LIMIT 20`;
  return NextResponse.json({ logs });
}
