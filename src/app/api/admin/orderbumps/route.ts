import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { validateAdminRequest } from "@/lib/adminAuth";

const PRODUTOS = {
  "3MSNI0": "3X - Rifa da Sorte - MIL REAIS",
  "3MSNI1": "Pacote embalagem figurinha da COPA 2026 - PDF IMPRESSÃO",
  "3MSNI2": "Poster A4 da sua Figurinha Personalizada - PDF IMPRESSÃO",
  "3MSNI3": "10X - Rifa da Sorte - MIL REAIS",
  "3MSNI4": "Edição Especial: Figurinha do Neymar - Camisa da Seleção (PDF)",
} as const;

function phoneVariants(raw: string): string[] {
  const base = raw.replace(/\D/g, "");
  const variants = new Set<string>();
  const stripped = base.startsWith("55") && base.length > 11 ? base.slice(2) : base;
  variants.add(stripped);
  variants.add("55" + stripped);
  if (stripped.length === 11) {
    const sem9 = stripped.slice(0, 2) + stripped.slice(3);
    variants.add(sem9);
    variants.add("55" + sem9);
  }
  if (stripped.length === 10) {
    const com9 = stripped.slice(0, 2) + "9" + stripped.slice(2);
    variants.add(com9);
    variants.add("55" + com9);
  }
  return Array.from(variants).filter(v => v.length >= 8);
}

const KNOWN_HASHES = Object.keys(PRODUTOS);

export async function GET(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  try {
    const rows = await sql`
      SELECT
        pi.id,
        pi.order_id,
        pi.email,
        pi.telefone,
        pi.nome,
        pi.offer_name,
        pi.product_name,
        pi.offer_hash,
        pi.price,
        pi.status,
        pi.created_at,
        CASE WHEN pi.order_id LIKE 'manual_%' THEN true ELSE false END AS manual
      FROM pedido_items pi
      WHERE pi.offer_hash = ANY(${KNOWN_HASHES}::text[])
      ${q ? sql`AND (
        pi.telefone ILIKE ${"%" + q + "%"}
        OR pi.nome ILIKE ${"%" + q + "%"}
        OR pi.offer_name ILIKE ${"%" + q + "%"}
        OR pi.email ILIKE ${"%" + q + "%"}
      )` : sql``}
      ORDER BY pi.created_at DESC
      LIMIT 500
    `;
    return NextResponse.json({ items: rows, produtos: PRODUTOS });
  } catch (err) {
    console.error("orderbumps GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  let body: { telefone?: string; offer_hash?: string; nome?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rawPhone = (body.telefone || "").replace(/\D/g, "");
  const stripped = rawPhone.startsWith("55") && rawPhone.length > 11 ? rawPhone.slice(2) : rawPhone;
  const telefone = stripped.length === 10 ? stripped.slice(0, 2) + "9" + stripped.slice(2) : stripped;

  if (telefone.length < 10) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  }

  const offerHash = body.offer_hash as keyof typeof PRODUTOS;
  if (!offerHash || !PRODUTOS[offerHash]) {
    return NextResponse.json({ error: "Produto inválido" }, { status: 400 });
  }

  const offerName = PRODUTOS[offerHash];
  const orderId = `manual_${Date.now()}`;
  const nome = (body.nome || "").trim() || null;

  // Busca email pelo telefone (variantes) para linkar ao pedido existente
  const variants = phoneVariants(telefone);
  const emailRow = await sql`
    SELECT email FROM pedidos
    WHERE telefone = ANY(${variants}::text[]) AND email IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  `.catch(() => []);
  const email = emailRow[0]?.email || `tel:${telefone}`;

  try {
    await sql`
      INSERT INTO pedido_items
        (order_id, email, telefone, nome, item_type, offer_hash, offer_name, product_name, price, status, created_at)
      VALUES
        (${orderId}, ${email}, ${telefone}, ${nome}, 'product', ${offerHash}, ${offerName}, ${offerName}, 0, 'pago', NOW())
    `;
  } catch (err) {
    console.error("orderbumps POST insert error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, telefone, offerName });
}

export async function DELETE(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await sql`DELETE FROM pedido_items WHERE id = ${Number(id)} AND order_id LIKE 'manual_%'`;
  return NextResponse.json({ ok: true });
}
