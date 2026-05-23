import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { put } from "@vercel/blob";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const filePath = join(process.cwd(), "public", "pacotinho-copa-2026.pdf");
  const file = readFileSync(filePath);

  const blob = await put("pacotinho-copa-2026.pdf", file, {
    access: "public",
    contentType: "application/pdf",
  });

  return NextResponse.json({ url: blob.url });
}
