import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { validateAdminRequest } from "@/lib/adminAuth";

function periodToCutoff(period: string): Date | null {
  const now = Date.now();
  const hourMatch = period.match(/^(\d+)h$/);
  if (hourMatch) return new Date(now - parseInt(hourMatch[1]) * 3600_000);
  if (period === "today") {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }
  if (period === "7d")  return new Date(now - 7  * 86400_000);
  if (period === "30d") return new Date(now - 30 * 86400_000);
  return null;
}

export async function GET(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  try {
    try { await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS oferta VARCHAR(10)`; } catch { /* ok */ }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";
    const lite   = searchParams.get("lite") !== "0"; // lite=1 by default, pass lite=0 for full
    const cutoff = periodToCutoff(period);

    const pfSession = cutoff ? sql`AND s.updated_at >= ${cutoff}` : sql``;
    const pfSimple  = cutoff ? sql`AND updated_at >= ${cutoff}`   : sql``;

    // ── 4 queries leves: sessões, funil, diário, segunda ──
    const [sessionRow, funnelSteps, dailySessions, segundaRow] = await Promise.all([

      sql`
        SELECT
          COUNT(DISTINCT session_id)::int AS total,
          COUNT(DISTINCT session_id) FILTER (WHERE step IN ('result_view','result_ok'))::int AS viu_preco,
          COUNT(DISTINCT session_id) FILTER (WHERE cta_clicked = TRUE)::int                  AS cta,
          COUNT(DISTINCT session_id) FILTER (WHERE obrigado = TRUE)::int                     AS obrigados,
          COUNT(DISTINCT session_id) FILTER (WHERE oferta = 'a' OR oferta IS NULL)::int                                         AS total_a,
          COUNT(DISTINCT session_id) FILTER (WHERE step IN ('result_view','result_ok') AND (oferta='a' OR oferta IS NULL))::int  AS viu_preco_a,
          COUNT(DISTINCT session_id) FILTER (WHERE cta_clicked = TRUE AND (oferta='a' OR oferta IS NULL))::int                  AS cta_a,
          COUNT(DISTINCT session_id) FILTER (WHERE obrigado = TRUE    AND (oferta='a' OR oferta IS NULL))::int                  AS obrigados_a,
          COUNT(DISTINCT session_id) FILTER (WHERE oferta = 'b')::int                                                           AS total_b,
          COUNT(DISTINCT session_id) FILTER (WHERE step IN ('result_view','result_ok') AND oferta='b')::int                     AS viu_preco_b,
          COUNT(DISTINCT session_id) FILTER (WHERE cta_clicked = TRUE AND oferta='b')::int                                      AS cta_b,
          COUNT(DISTINCT session_id) FILTER (WHERE obrigado = TRUE    AND oferta='b')::int                                      AS obrigados_b
        FROM sessions
        WHERE email IS NOT NULL ${pfSimple}
      `,

      sql`
        SELECT step,
          COUNT(*)::int AS count,
          COUNT(*) FILTER (WHERE oferta = 'a' OR oferta IS NULL)::int AS count_a,
          COUNT(*) FILTER (WHERE oferta = 'b')::int                   AS count_b
        FROM sessions
        WHERE email IS NOT NULL ${pfSimple}
        GROUP BY step
        ORDER BY count DESC
      `,

      sql`
        SELECT updated_at::date AS day,
          COUNT(DISTINCT session_id)::int AS count,
          COUNT(DISTINCT session_id) FILTER (WHERE oferta = 'a' OR oferta IS NULL)::int AS count_a,
          COUNT(DISTINCT session_id) FILTER (WHERE oferta = 'b')::int                   AS count_b
        FROM sessions
        WHERE email IS NOT NULL AND updated_at >= NOW() - INTERVAL '14 days'
        GROUP BY day ORDER BY day
      `,

      sql`
        SELECT
          COUNT(DISTINCT session_id) FILTER (WHERE step = 'segunda_obg')::int                              AS cliques,
          COUNT(DISTINCT session_id) FILTER (WHERE step = 'segunda_start')::int                            AS starts,
          COUNT(DISTINCT session_id) FILTER (WHERE oferta = 'segunda' AND step IN ('result_view','result_ok'))::int AS viu_preco_seg,
          COUNT(DISTINCT session_id) FILTER (WHERE oferta = 'segunda' AND cta_clicked = TRUE)::int         AS cta_seg,
          COUNT(DISTINCT session_id) FILTER (WHERE oferta = 'segunda' AND obrigado = TRUE)::int            AS obrigados_seg
        FROM sessions
        WHERE (step IN ('segunda_obg','segunda_start') OR oferta = 'segunda') ${pfSimple}
      `,
    ]);

    const s   = sessionRow[0] ?? { total: 0, viu_preco: 0, cta: 0, obrigados: 0, total_a: 0, viu_preco_a: 0, cta_a: 0, obrigados_a: 0, total_b: 0, viu_preco_b: 0, cta_b: 0, obrigados_b: 0 };
    const seg = segundaRow[0] ?? { cliques: 0, starts: 0, viu_preco_seg: 0, cta_seg: 0, obrigados_seg: 0 };

    const base = {
      sessions: {
        total: s.total, cta: s.cta, obrigados: s.obrigados,
        daily: dailySessions,
        a: { total: s.total_a, viu_preco: s.viu_preco_a, cta: s.cta_a, obrigados: s.obrigados_a },
        b: { total: s.total_b, viu_preco: s.viu_preco_b, cta: s.cta_b, obrigados: s.obrigados_b },
      },
      funnel: funnelSteps,
      segunda: {
        cliques: seg.cliques, starts: seg.starts, compras: 0, receita: null,
        viu_preco: seg.viu_preco_seg, cta: seg.cta_seg, obrigados: seg.obrigados_seg,
      },
      // compat
      pagos: 0, obrigadosCount: s.obrigados,
      vendas: { pagos: 0, a_count: 0, a_total: 0, b_count: 0, b_total: 0, bumps_count: 0, bumps_receita: 0, daily: [] },
      leads: [], obrigados: [],
    };

    if (lite) return NextResponse.json(base);

    // ── Queries pesadas — só para LeadsTab (lite=0) ──
    const pfPedidos = cutoff ? sql`AND created_at >= ${cutoff}` : sql``;
    const [leads, obrigados] = await Promise.all([
      sql`
        SELECT s.session_id, s.email, s.nome, s.step,
               to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
               COALESCE(s.cta_clicked, FALSE) AS cta_clicked,
               COALESCE(s.obrigado,    FALSE) AS obrigado,
               pi.price AS price_paid
        FROM sessions s
        LEFT JOIN LATERAL (
          SELECT price FROM pedido_items
          WHERE (item_type IS NULL OR item_type != 'order_bump')
            AND (telefone = s.email OR email = (SELECT p.email FROM pedidos p WHERE p.telefone = s.email ORDER BY p.created_at DESC LIMIT 1))
          ORDER BY created_at DESC LIMIT 1
        ) pi ON TRUE
        WHERE s.email IS NOT NULL ${pfSession}
        ORDER BY s.updated_at DESC
        LIMIT 500
      `,
      sql`
        SELECT s.session_id, s.email, s.nome,
               to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
               COALESCE(p.telefone, s.email) AS telefone
        FROM sessions s
        LEFT JOIN LATERAL (
          SELECT telefone FROM pedidos
          WHERE (telefone = s.email OR email = s.email) AND telefone IS NOT NULL
          ORDER BY created_at DESC LIMIT 1
        ) p ON TRUE
        WHERE s.obrigado = TRUE ${pfSession}
        ORDER BY s.updated_at DESC
        LIMIT 300
      `,
    ]);

    return NextResponse.json({ ...base, leads, obrigados });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[funil] erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
