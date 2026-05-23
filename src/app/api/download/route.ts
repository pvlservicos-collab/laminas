import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "q2gdaftns1gmkspz.public.blob.vercel-storage.com",
  "public.blob.vercel-storage.com",
];

export async function GET(req: NextRequest) {
  const fileUrl = req.nextUrl.searchParams.get("url");
  const rawName = req.nextUrl.searchParams.get("name") || "figurinha-copa-2026";
  // Strip path separators to prevent header injection via Content-Disposition
  const fileName = rawName.replace(/[/\\:*?"<>|]/g, "_").slice(0, 100);

  if (!fileUrl) {
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "URL não permitida" }, { status: 403 });
  }

  if (!ALLOWED_HOSTS.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith("." + h))) {
    return NextResponse.json({ error: "URL não permitida" }, { status: 403 });
  }

  try {
    const res = await fetch(fileUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const ext = contentType.includes("pdf") ? ".pdf" : contentType.includes("png") ? ".png" : contentType.includes("jpeg") ? ".jpg" : "";
    const fullName = fileName.endsWith(ext) ? fileName : `${fileName}${ext}`;

    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fullName}"`,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao baixar arquivo" }, { status: 500 });
  }
}
