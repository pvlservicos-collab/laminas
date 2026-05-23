import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, step, email, nome, oferta } = body;
    if (!session_id || !step) return new NextResponse(null, { status: 204 });
    // Limites de tamanho para evitar polução de BD
    if (typeof session_id !== "string" || session_id.length > 64) return new NextResponse(null, { status: 204 });
    if (typeof step !== "string" || step.length > 32) return new NextResponse(null, { status: 204 });
    if (email && (typeof email !== "string" || email.length > 20)) return new NextResponse(null, { status: 204 });
    if (nome && (typeof nome !== "string" || nome.length > 80)) return new NextResponse(null, { status: 204 });
    const validOferta = (oferta === "a" || oferta === "b" || oferta === "segunda") ? oferta : null;

    const sql = getDb();
    // Lazy migration — cria coluna se não existir (idempotente)
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS oferta VARCHAR(10)`.catch(() => {});
    const isCta = step === "checkout";
    const isObrigado = step === "obrigado";

    await sql`
      INSERT INTO sessions (session_id, step, email, nome, cta_clicked, obrigado, oferta, updated_at)
      VALUES (
        ${session_id}, ${step}, ${email || null}, ${nome || null},
        ${isCta}, ${isObrigado}, ${validOferta}, NOW()
      )
      ON CONFLICT (session_id) DO UPDATE SET
        step = EXCLUDED.step,
        email = COALESCE(EXCLUDED.email, sessions.email),
        nome = COALESCE(EXCLUDED.nome, sessions.nome),
        cta_clicked = sessions.cta_clicked OR ${isCta},
        obrigado = sessions.obrigado OR ${isObrigado},
        oferta = COALESCE(sessions.oferta, EXCLUDED.oferta),
        updated_at = NOW()
    `;
  } catch {
    // silencioso
  }
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id) return new NextResponse(null, { status: 204 });
    const sql = getDb();
    await sql`DELETE FROM sessions WHERE session_id = ${session_id}`;
  } catch { /* ignora */ }
  return new NextResponse(null, { status: 204 });
}
