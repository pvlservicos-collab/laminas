import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getSessionToken } from "@/lib/adminAuth";

const VALID_USERS = ["pedro", "vini", "tel"];

// Rate limiting: máx 8 tentativas por IP em 5 minutos
const authAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + 5 * 60_000 });
    return true;
  }
  if (entry.count >= 8) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas. Aguarde 5 minutos." }, { status: 429 });
  }

  const { name } = await req.json();
  const normalized = String(name || "").trim().toLowerCase().slice(0, 32);

  if (!VALID_USERS.includes(normalized)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user: normalized });
  res.cookies.set(SESSION_COOKIE, getSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
