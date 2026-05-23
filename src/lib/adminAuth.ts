import { NextRequest } from "next/server";

export const SESSION_COOKIE = "painel_sid";

function getSecret(): string {
  return process.env.ADMIN_TOKEN || "figurinha-painel-2026-secret";
}

export function validateAdminRequest(req: NextRequest): boolean {
  const cookie = req.cookies.get(SESSION_COOKIE);
  return !!cookie && cookie.value === getSecret();
}

export function getSessionToken(): string {
  return getSecret();
}
