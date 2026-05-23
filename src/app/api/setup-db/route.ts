import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!secret || secret !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sql = getDb();

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        data_nascimento DATE,
        clube VARCHAR(100),
        jogador_favorito VARCHAR(100),
        peso_estimado VARCHAR(20),
        altura_estimada VARCHAR(20),
        sticker_id VARCHAR(100),
        sticker_url TEXT,
        status VARCHAR(20) DEFAULT 'pendente',
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        paid_at TIMESTAMP,
        delivered_at TIMESTAMP
      )
    `;

    await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS sticker_url TEXT`;
    await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS telefone VARCHAR(30)`;
    await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pdf_url TEXT`;
    await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS preview_url TEXT`;
    await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS whats_pendente BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS whats_enviado BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS recovery_sent BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS recovery_sent_at TIMESTAMP`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pedidos_status_email ON pedidos(status, email) WHERE recovery_sent = FALSE`;

    await sql`
      CREATE TABLE IF NOT EXISTS pedido_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER,
        email VARCHAR(255),
        nome VARCHAR(100),
        item_type VARCHAR(30) DEFAULT 'product',
        offer_hash VARCHAR(100),
        offer_name VARCHAR(200),
        product_name VARCHAR(200),
        price INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pago',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(order_id, offer_hash)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100),
        clube VARCHAR(100),
        jogador_favorito VARCHAR(100),
        step_reached INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        converted BOOLEAN DEFAULT FALSE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255),
        nome VARCHAR(100),
        step VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cta_clicked BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS obrigado BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS oferta VARCHAR(1)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_step ON sessions(step)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at)`;

    // Tabela de idempotência pra webhooks
    await sql`
      CREATE TABLE IF NOT EXISTS webhook_processed (
        id SERIAL PRIMARY KEY,
        idempotency_key VARCHAR(200) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Índices pra performance em escala
    await sql`CREATE INDEX IF NOT EXISTS idx_pedidos_email ON pedidos(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pedidos_sticker_id ON pedidos(sticker_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pedido_items_email ON pedido_items(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_webhook_processed_key ON webhook_processed(idempotency_key)`;

    return NextResponse.json({ ok: true, message: "Tabelas criadas com sucesso" });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
