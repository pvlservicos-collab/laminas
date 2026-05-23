import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";

// Rate limiting: 3 gerações/IP/5 min (CPU-intensivo)
const gerarPdfRL = new Map<string, { count: number; resetAt: number }>();
function checkRL(ip: string): boolean {
  const now = Date.now();
  const e = gerarPdfRL.get(ip);
  if (!e || now > e.resetAt) { gerarPdfRL.set(ip, { count: 1, resetAt: now + 300_000 }); return true; }
  if (e.count >= 3) return false;
  e.count++;
  return true;
}

const CM_TO_PT = 28.3465;
const A4_W = 21 * CM_TO_PT;
const A4_H = 29.7 * CM_TO_PT;

// Reference sticker size for margin calculations (kept from original layout)
const REF_W = 6 * CM_TO_PT;
const REF_H = 9 * CM_TO_PT;

const COLS = 4;
const ROWS = 4;

// Top/bottom margin: same as old 3-row layout
const marginY = (A4_H - 3 * REF_H) / 2;
// Left/right margin: half of old 3-column layout
const marginX = (A4_W - 3 * REF_W) / 4;

const cellW = (A4_W - 2 * marginX) / COLS;
const cellH = (A4_H - 2 * marginY) / ROWS;

async function embedImage(pdf: PDFDocument, bytes: Uint8Array) {
  try { return await pdf.embedPng(bytes); } catch { return await pdf.embedJpg(bytes); }
}

async function generateGrid(stickerBytes: Uint8Array): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const img = await embedImage(pdf, stickerBytes);
  const page = pdf.addPage([A4_W, A4_H]);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      page.drawImage(img, {
        x: marginX + col * cellW,
        y: A4_H - marginY - (row + 1) * cellH,
        width: cellW,
        height: cellH,
      });
    }
  }

  // Linhas de corte
  const gray = rgb(0.5, 0.5, 0.5);
  const MARK = 10;
  const gridW = COLS * cellW;
  const gridH = ROWS * cellH;
  for (let row = 0; row <= ROWS; row++) {
    const y = A4_H - marginY - row * cellH;
    page.drawLine({ start: { x: marginX - MARK, y }, end: { x: marginX, y }, thickness: 0.5, color: gray });
    page.drawLine({ start: { x: marginX + gridW, y }, end: { x: marginX + gridW + MARK, y }, thickness: 0.5, color: gray });
  }
  for (let col = 0; col <= COLS; col++) {
    const x = marginX + col * cellW;
    page.drawLine({ start: { x, y: A4_H - marginY }, end: { x, y: A4_H - marginY + MARK }, thickness: 0.5, color: gray });
    page.drawLine({ start: { x, y: A4_H - marginY - gridH - MARK }, end: { x, y: A4_H - marginY - gridH }, thickness: 0.5, color: gray });
  }

  return Buffer.from(await pdf.save());
}

async function generateFullA4(stickerBytes: Uint8Array): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const img = await embedImage(pdf, stickerBytes);
  const page = pdf.addPage([A4_W, A4_H]);

  // Figurinha ocupa a folha toda, sem margens
  page.drawImage(img, { x: 0, y: 0, width: A4_W, height: A4_H });

  return Buffer.from(await pdf.save());
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRL(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const layout = (form.get("layout") as string) || "grid";

  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());

  const pdfBuffer = layout === "a4"
    ? await generateFullA4(bytes)
    : await generateGrid(bytes);

  const filename = layout === "a4" ? "figurinha-a4-completo.pdf" : "figurinha-grade-4x4.pdf";

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
