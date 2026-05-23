import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { put } from "@vercel/blob";
import { PDFDocument, rgb } from "pdf-lib";
import { validateAdminRequest } from "@/lib/adminAuth";

const STICKER_W_CM = 6;
const STICKER_H_CM = 9;
const A4_W_CM = 21;
const A4_H_CM = 29.7;
const CM_TO_PT = 28.3465;
const STICKER_W = STICKER_W_CM * CM_TO_PT;
const STICKER_H = STICKER_H_CM * CM_TO_PT;
const A4_W = A4_W_CM * CM_TO_PT;
const A4_H = A4_H_CM * CM_TO_PT;
const COLS = 3;
const ROWS = 3;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pedidoId, email } = await req.json();
  if (!pedidoId || !email) {
    return NextResponse.json({ error: "pedidoId e email obrigatórios" }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`SELECT nome, sticker_url, sticker_id, pdf_url FROM pedidos WHERE id = ${pedidoId}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const pedido = rows[0];
  if (!pedido.sticker_url) {
    return NextResponse.json({ error: "Figurinha não encontrada" }, { status: 404 });
  }

  const customerName = (pedido.nome || "cliente").replace(/[<>"'&]/g, "");
  let pdfUrl = pedido.pdf_url;

  if (!pdfUrl) {
    const stickerRes = await fetch(pedido.sticker_url);
    const stickerBytes = new Uint8Array(await stickerRes.arrayBuffer());

    const pdf = await PDFDocument.create();
    let stickerImage;
    try { stickerImage = await pdf.embedPng(stickerBytes); } catch { stickerImage = await pdf.embedJpg(stickerBytes); }
    const page = pdf.addPage([A4_W, A4_H]);
    const gridW = COLS * STICKER_W;
    const gridH = ROWS * STICKER_H;
    const marginX = (A4_W - gridW) / 2;
    const marginY = (A4_H - gridH) / 2;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        page.drawImage(stickerImage, {
          x: marginX + col * STICKER_W,
          y: A4_H - marginY - (row + 1) * STICKER_H,
          width: STICKER_W,
          height: STICKER_H,
        });
      }
    }

    const gray = rgb(0.5, 0.5, 0.5);
    const MARK = 10;
    for (let row = 0; row <= ROWS; row++) {
      const y = A4_H - marginY - row * STICKER_H;
      page.drawLine({ start: { x: marginX - MARK, y }, end: { x: marginX, y }, thickness: 0.5, color: gray });
      page.drawLine({ start: { x: marginX + gridW, y }, end: { x: marginX + gridW + MARK, y }, thickness: 0.5, color: gray });
    }
    for (let col = 0; col <= COLS; col++) {
      const x = marginX + col * STICKER_W;
      page.drawLine({ start: { x, y: A4_H - marginY }, end: { x, y: A4_H - marginY + MARK }, thickness: 0.5, color: gray });
      page.drawLine({ start: { x, y: A4_H - marginY - gridH - MARK }, end: { x, y: A4_H - marginY - gridH }, thickness: 0.5, color: gray });
    }

    const pdfBytes = await pdf.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const pdfBlob = await put(`pdfs/${pedido.sticker_id}.pdf`, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
      allowOverwrite: true,
    });
    pdfUrl = pdfBlob.url;

    await sql`UPDATE pedidos SET pdf_url = ${pdfUrl} WHERE id = ${pedidoId}`;
  }

  const pdfRes = await fetch(pdfUrl);
  const pdfBuffer2 = Buffer.from(await pdfRes.arrayBuffer());
  const stickerRes2 = await fetch(pedido.sticker_url);
  const stickerBuf2 = new Uint8Array(await stickerRes2.arrayBuffer());

  const { sendEmail } = await import("@/lib/email");
  await sendEmail(email, customerName, stickerBuf2, pdfBuffer2, pdfUrl);

  await sql`UPDATE pedidos SET email = ${email}, status = 'entregue', delivered_at = NOW() WHERE id = ${pedidoId}`;

  return NextResponse.json({ ok: true, message: `Enviado para ${email}` });
}
