import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { validateAdminRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();

  const [perKey, recentes] = await Promise.all([
    sql`
      SELECT
        api_key_used,
        COUNT(*)::int                        AS total,
        ROUND(AVG(generation_ms))::int        AS avg_ms,
        MIN(generation_ms)                    AS min_ms,
        MAX(generation_ms)                    AS max_ms
      FROM pedidos
      WHERE sticker_url IS NOT NULL
        AND api_key_used IS NOT NULL
        AND generation_ms IS NOT NULL
      GROUP BY api_key_used
      ORDER BY api_key_used
    `,
    sql`
      SELECT
        nome,
        email,
        api_key_used,
        generation_ms,
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
      FROM pedidos
      WHERE sticker_url IS NOT NULL
        AND api_key_used IS NOT NULL
        AND generation_ms IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 100
    `,
  ]);

  return NextResponse.json({ perKey, recentes });
}
