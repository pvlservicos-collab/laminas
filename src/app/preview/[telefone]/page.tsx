import { getDb } from "@/lib/db";
import PreviewClient from "./PreviewClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ telefone: string }>;
}

async function getPedido(telefone: string) {
  const clean = telefone.replace(/\D/g, "").slice(0, 20);
  if (clean.length < 8) return null;

  const sql = getDb();
  const rows = await sql<{ nome: string; sticker_id: string; preview_url: string | null; sticker_url: string | null }[]>`
    SELECT nome, sticker_id, preview_url, sticker_url
    FROM pedidos
    WHERE (telefone = ${clean} OR telefone = ${"55" + clean} OR telefone = ${clean.replace(/^55/, "")})
    ORDER BY (sticker_url IS NOT NULL) DESC, created_at DESC
    LIMIT 1
  `.catch(() => []);

  return rows[0] ?? null;
}

export default async function PreviewTelefonePage({ params }: Props) {
  const { telefone } = await params;
  const pedido = await getPedido(telefone);

  const imageUrl = pedido?.preview_url || pedido?.sticker_url || null;
  const nome = pedido?.nome || null;
  const stickerId = pedido?.sticker_id || "";

  return <PreviewClient imageUrl={imageUrl} nome={nome} stickerId={stickerId} />;
}
