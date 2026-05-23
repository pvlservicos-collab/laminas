import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { list } from "@vercel/blob";

export async function GET(req: NextRequest) {
  const pedidoId = req.nextUrl.searchParams.get("pedidoId");
  const email = req.nextUrl.searchParams.get("email");

  if (!pedidoId && !email) {
    return NextResponse.json({ error: "pedidoId ou email obrigatório" }, { status: 400 });
  }

  const sql = getDb();

  const pedido = pedidoId
    ? await sql`SELECT id, nome, email, sticker_id, sticker_url, pdf_url FROM pedidos WHERE id = ${Number(pedidoId)}`
    : await sql`SELECT id, nome, email, sticker_id, sticker_url, pdf_url FROM pedidos WHERE email = ${email} AND sticker_url IS NOT NULL ORDER BY created_at DESC LIMIT 1`;

  if (pedido.length === 0) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const p = pedido[0];
  const customerEmail = p.email || email;

  const bumps = customerEmail
    ? await sql`SELECT DISTINCT product_name FROM pedido_items WHERE email = ${customerEmail} AND item_type = 'order_bump'`
    : [];

  const BASE = "https://gerarfigurinhas.vercel.app";
  const dl = (url: string, name: string) => `${BASE}/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;

  const materiais: { tipo: string; nome: string; url: string }[] = [];
  const clienteNome = (p.nome || "figurinha").toLowerCase().replace(/\s+/g, "-");

  if (p.sticker_url) {
    materiais.push({ tipo: "figurinha", nome: `Figurinha ${p.nome} (PNG)`, url: dl(p.sticker_url, `figurinha-${clienteNome}`) });
  }

  if (p.pdf_url) {
    materiais.push({ tipo: "pdf", nome: `PDF Figurinhas ${p.nome} (A4)`, url: dl(p.pdf_url, `figurinhas-impressao-${clienteNome}`) });
  }

  const bumpNames = bumps.map((b: Record<string, string>) => (b.product_name || "").toLowerCase());

  if (bumpNames.some((n: string) => n.includes("pacot") || n.includes("impressa") || n.includes("impressão"))) {
    materiais.push({ tipo: "pacotinho", nome: "Pacotinho Oficial Copa 2026", url: dl(`${BASE}/pacotinho-copa-2026.pdf`, "pacotinho-copa-2026") });
  }

  if (bumpNames.some((n: string) => n.includes("poster"))) {
    if (p.sticker_id) {
      const posterBlobs = await list({ prefix: `posters/${p.sticker_id}` }).catch(() => ({ blobs: [] }));
      if (posterBlobs.blobs.length > 0) {
        materiais.push({ tipo: "poster", nome: `Poster A2 ${p.nome}`, url: dl(posterBlobs.blobs[0].url, `poster-a2-${clienteNome}`) });
      } else {
        materiais.push({ tipo: "poster", nome: "Poster A2 (processando)", url: "" });
      }
    }
  }

  if (bumpNames.some((n: string) => n.includes("album") || n.includes("álbum"))) {
    materiais.push({ tipo: "album", nome: "Album Copa Completo", url: "processando" });
  }

  return NextResponse.json({ email: customerEmail, nome: p.nome, pedidoId: p.id, materiais });
}
