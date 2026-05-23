import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { validateAdminRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const offset = Number(searchParams.get("offset") || "0");
  const limit  = Number(searchParams.get("limit")  || "100");
  const search = searchParams.get("search") || "";
  const all    = searchParams.get("all") === "1";
  const nome   = searchParams.get("nome") || "";
  const fone   = searchParams.get("fone") || "";
  const date   = searchParams.get("date") || "";

  let pedidos;
  let totalFiltered;

  if (all) {
    const nomeFilter = nome.trim() ? sql`AND p.nome ILIKE ${`%${nome.trim()}%`}` : sql``;
    const foneFilter = fone.trim() ? sql`AND p.telefone ILIKE ${`%${fone.trim()}%`}` : sql``;
    const dateFilter = date === "today"
      ? sql`AND p.created_at >= CURRENT_DATE`
      : date === "yesterday"
      ? sql`AND p.created_at >= CURRENT_DATE - INTERVAL '1 day' AND p.created_at < CURRENT_DATE`
      : sql``;

    pedidos = await sql`
      SELECT p.id, p.nome, p.clube, p.telefone, p.sticker_url, p.preview_url, p.sticker_id, p.status,
             p.created_at,
             (SELECT pi.price FROM pedido_items pi WHERE pi.email = p.email AND pi.offer_hash = '3MSNHT' ORDER BY pi.created_at DESC LIMIT 1) as price_paid
      FROM pedidos p
      WHERE p.sticker_url IS NOT NULL ${nomeFilter} ${foneFilter} ${dateFilter}
      ORDER BY p.id DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const countResult = await sql`
      SELECT COUNT(*)::int as total FROM pedidos p
      WHERE sticker_url IS NOT NULL ${nomeFilter} ${foneFilter} ${dateFilter}
    `;
    totalFiltered = countResult[0].total;
  } else if (search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    pedidos = await sql`
      SELECT p.id, p.nome, p.clube, p.jogador_favorito, p.sticker_url, p.sticker_id, p.status, p.email, p.telefone, p.pdf_url,
        COALESCE(p.whats_enviado, FALSE) as whats_enviado,
        CASE WHEN p.status IN ('pago', 'entregue', 'recuperado') AND COALESCE(p.whats_enviado, FALSE) = FALSE AND EXISTS (
          SELECT 1 FROM pedido_items pi
          WHERE pi.email = p.email AND pi.item_type = 'order_bump'
          AND pi.product_name LIKE '%What%'
        ) THEN TRUE ELSE FALSE END as whats_pendente,
        p.created_at, p.paid_at, p.delivered_at,
        (SELECT pi.price FROM pedido_items pi WHERE pi.email = p.email AND pi.offer_hash = '3MSNHT' ORDER BY pi.created_at DESC LIMIT 1) as price_paid
      FROM pedidos p
      WHERE p.sticker_url IS NOT NULL AND (p.nome ILIKE ${searchPattern} OR p.email ILIKE ${searchPattern} OR p.clube ILIKE ${searchPattern} OR p.telefone ILIKE ${searchPattern})
      ORDER BY p.id DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const countResult = await sql`
      SELECT COUNT(*)::int as total FROM pedidos
      WHERE sticker_url IS NOT NULL AND (nome ILIKE ${`%${search.trim()}%`} OR email ILIKE ${`%${search.trim()}%`} OR clube ILIKE ${`%${search.trim()}%`} OR telefone ILIKE ${`%${search.trim()}%`})
    `;
    totalFiltered = countResult[0].total;
  } else {
    pedidos = await sql`
      SELECT p.id, p.nome, p.clube, p.jogador_favorito, p.sticker_url, p.sticker_id, p.status, p.email, p.telefone, p.pdf_url,
        COALESCE(p.whats_enviado, FALSE) as whats_enviado,
        CASE WHEN p.status IN ('pago', 'entregue', 'recuperado') AND COALESCE(p.whats_enviado, FALSE) = FALSE AND EXISTS (
          SELECT 1 FROM pedido_items pi
          WHERE pi.email = p.email AND pi.item_type = 'order_bump'
          AND pi.product_name LIKE '%What%'
        ) THEN TRUE ELSE FALSE END as whats_pendente,
        p.created_at, p.paid_at, p.delivered_at,
        (SELECT pi.price FROM pedido_items pi WHERE pi.email = p.email AND pi.offer_hash = '3MSNHT' ORDER BY pi.created_at DESC LIMIT 1) as price_paid
      FROM pedidos p
      WHERE p.status IN ('pago', 'entregue', 'recuperado')
      ORDER BY p.id DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const countResult = await sql`SELECT COUNT(*)::int as total FROM pedidos WHERE status IN ('pago','entregue','recuperado')`;
    totalFiltered = countResult[0].total;
  }

  const statsResult = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('pago', 'entregue', 'recuperado'))::int AS total,
      COUNT(*) FILTER (WHERE status = 'pendente')::int AS pendentes,
      COUNT(*) FILTER (WHERE status IN ('pago', 'entregue', 'recuperado'))::int AS pagos,
      COUNT(*) FILTER (WHERE status = 'entregue')::int AS entregues
    FROM pedidos
  `;

  return NextResponse.json({
    pedidos,
    stats: statsResult[0],
    totalFiltered,
    offset,
    limit,
    hasMore: offset + pedidos.length < totalFiltered,
  });
}

export async function DELETE(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (email === "all") {
    await sql`DELETE FROM pedidos`;
    return NextResponse.json({ ok: true, message: "Todos os pedidos removidos" });
  }

  if (email) {
    await sql`DELETE FROM pedidos WHERE email = ${email}`;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Parâmetro email obrigatório" }, { status: 400 });
}
