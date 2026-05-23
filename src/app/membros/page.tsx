"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Pedido {
  id: number;
  nome: string | null;
  clube: string | null;
  sticker_url: string;
  preview_url: string | null;
  pdf_url: string | null;
  status: string;
  created_at: string;
}

interface PedidoItem {
  item_type: string;
  offer_name: string | null;
  product_name: string | null;
  price: number;
  status: string;
  created_at: string;
}

interface MemberData {
  nome: string | null;
  pedidos: Pedido[];
  items: PedidoItem[];
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

interface CatalogProduct {
  id: string;
  name: string;
  desc: React.ReactNode;
  section: "main" | "sorteio";
  renderImage: (bought: boolean) => React.ReactNode;
  acquireUrl?: string;
  downloadLabel?: string;
  infoMode?: boolean;           // always visible, no lock/buy
  checkBought?: (d: MemberData) => boolean;
  getDownloadUrl?: (d: MemberData) => string | null;
  boughtExtra?: React.ReactNode;
  boughtMessage?: string;
  renderCard?: (data: MemberData, width: number) => React.ReactNode;
}

function ProductImg({ src, alt, bought }: { src: string; alt: string; bought: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={{
        width: "100%", height: "100%", objectFit: "cover", display: "block",
        filter: bought ? "none" : "grayscale(0.65)",
      }}
    />
  );
}

const CATALOG: CatalogProduct[] = [
  {
    id: "rifa-sorte",
    section: "main",
    name: "Rifa da Sorte",
    desc: (<>Sorteio em 11/06/2026<br /><span style={{ color: "#059669", fontWeight: 700 }}>Você já está participando! ✅</span></>),
    infoMode: true,
    renderImage: (bought) => <ProductImg src="/sorteio.webp" alt="Rifa da Sorte" bought={bought} />,
    getDownloadUrl: () => null,
    boughtExtra: (
      <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginTop: 4 }}>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, color: "#002395" }}>Resultado do sorteio:</p>
        <div style={{ minHeight: 40, borderRadius: 6, background: "#f8fafc" }} />
      </div>
    ),
  },
  {
    id: "pacote-pdf",
    section: "main",
    name: "Pacotinho Copa 2026",
    desc: "Deixe a experiência mais imersiva com o PDF dos pacotinhos oficiais",
    renderImage: (bought) => <ProductImg src="/kitembalagem.jpg" alt="Kit Embalagem Copa 2026" bought={bought} />,
    acquireUrl: "https://checkout.figurinhadacopadomundo.com/VCCL1O8SD2HQ",
    downloadLabel: "Baixar PDF",
    checkBought: (d) =>
      d.items.some(i =>
        i.offer_name?.toLowerCase().includes("pacote") ||
        i.product_name?.toLowerCase().includes("pacote") ||
        i.offer_name?.toLowerCase().includes("pacotinho") ||
        i.product_name?.toLowerCase().includes("pacotinho") ||
        i.offer_name?.toLowerCase().includes("kit") ||
        i.product_name?.toLowerCase().includes("kit")
      ),
    getDownloadUrl: () => "/figurinhacompleta-3linhas.pdf",
  },
  {
    id: "neymar",
    section: "main",
    name: "Figurinha Neymar",
    desc: "Camisa da seleção — pacote em PDF para impressão",
    renderImage: (bought) => <ProductImg src="/figurinhaney.jpg" alt="Figurinha Neymar" bought={bought} />,
    acquireUrl: "https://checkout.figurinhadacopadomundo.com/VCCL1O8SD2HT",
    checkBought: (d) =>
      d.items.some(i =>
        i.offer_name?.toLowerCase().includes("neymar") ||
        i.product_name?.toLowerCase().includes("neymar") ||
        i.offer_name?.toLowerCase().includes("camisa") ||
        i.product_name?.toLowerCase().includes("camisa")
      ),
    getDownloadUrl: () => null,
    renderCard: (data, width) => <NeymarCard data={data} width={width} />,
  },
  {
    id: "poster-a2",
    section: "main",
    name: "Poster A4",
    desc: "Baixe o PDF para imprimir e postar em sua casa",
    renderImage: (bought) => <ProductImg src="/Posterpdf.jpg" alt="Poster A4 PDF" bought={bought} />,
    acquireUrl: "https://checkout.figurinhadacopadomundo.com/VCCL1O8SD2HR",
    checkBought: (d) =>
      d.items.some(i =>
        i.offer_name?.toLowerCase().includes("poster") ||
        i.product_name?.toLowerCase().includes("poster") ||
        i.offer_name?.toLowerCase().includes("poste") ||
        i.product_name?.toLowerCase().includes("poste")
      ),
    getDownloadUrl: () => null,
    renderCard: (data, width) => <PosterA4Card data={data} width={width} />,
  },
  {
    id: "3x",
    section: "sorteio",
    name: "Pacote 3×",
    desc: "Figurinha em grade 3×3 para impressão — 9 unidades por folha",
    renderImage: (bought) => <ProductImg src="/3k.jpg" alt="Pacote 3x" bought={bought} />,
    acquireUrl: "https://checkout.figurinhadacopadomundo.com/VCCL1O8SD2HP",
    boughtMessage: "Você já aumentou suas chances",
    checkBought: (d) =>
      d.items.some(i =>
        i.offer_name?.toLowerCase().includes("3x") ||
        i.product_name?.toLowerCase().includes("3x") ||
        i.offer_name?.toLowerCase().includes("3 x") ||
        i.product_name?.toLowerCase().includes("3 x")
      ),
    getDownloadUrl: () => null,
  },
  {
    id: "10x",
    section: "sorteio",
    name: "Pacote 10×",
    desc: "10 folhas com sua figurinha — máximo para presentear",
    renderImage: (bought) => <ProductImg src="/10x.jpg" alt="Pacote 10x" bought={bought} />,
    acquireUrl: "https://checkout.figurinhadacopadomundo.com/VCCL1O8SD2HS",
    boughtMessage: "Você já aumentou suas chances",
    checkBought: (d) =>
      d.items.some(i =>
        i.offer_name?.toLowerCase().includes("10x") ||
        i.product_name?.toLowerCase().includes("10x") ||
        i.offer_name?.toLowerCase().includes("10 x") ||
        i.product_name?.toLowerCase().includes("10 x")
      ),
    getDownloadUrl: () => null,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0055")) digits = digits.slice(4);
  else if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  const n = digits.length;
  if (n === 0) return "";
  if (n <= 2) return `(${digits}`;
  if (n <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (n <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// ─── Card components ──────────────────────────────────────────────────────────

function StickerCard({ pedido }: { pedido: Pedido }) {
  return (
    <div style={{
      flexShrink: 0, width: 190, scrollSnapAlign: "start",
      borderRadius: 20, overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,.14)",
      background: "#fff",
      border: "2px solid #002395",
    }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "2/3", background: "#e2e8f0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pedido.preview_url || pedido.sticker_url}
          alt={pedido.nome || "figurinha"}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,.5) 0%, transparent 50%)",
        }} />
        <div style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
          <p style={{ color: "#fff", fontSize: 13, fontWeight: 800, margin: 0, textShadow: "0 1px 4px rgba(0,0,0,.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {pedido.nome || "Figurinha"}
          </p>
          <p style={{ color: "rgba(255,255,255,.75)", fontSize: 11, margin: "2px 0 0" }}>{pedido.clube || "Copa 2026"}</p>
        </div>
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "#002395", borderRadius: 8, padding: "3px 8px",
        }}>
          <span style={{ color: "#FFDF00", fontSize: 9, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase" }}>{pedido.status}</span>
        </div>
      </div>
      <div style={{ padding: "14px 14px 14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <a
            href={`/api/download?url=${encodeURIComponent(pedido.sticker_url)}&name=figurinha-${(pedido.nome || "copa").toLowerCase().replace(/\s+/g, "-")}`}
            style={{ display: "block", textAlign: "center", background: "#002395", color: "#fff", borderRadius: 10, padding: "10px 8px", fontSize: 12, fontWeight: 700, textDecoration: "none", letterSpacing: ".03em" }}
          >⬇ Baixar PNG</a>
          {pedido.pdf_url && (
            <a
              href={`/api/download?url=${encodeURIComponent(pedido.pdf_url)}&name=figurinha-pdf-${(pedido.nome || "copa").toLowerCase().replace(/\s+/g, "-")}`}
              style={{ display: "block", textAlign: "center", background: "#f8fafc", color: "#334155", borderRadius: 10, padding: "10px 8px", fontSize: 12, fontWeight: 700, textDecoration: "none", border: "1px solid #e2e8f0" }}
            >📄 PDF</a>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalogCard({ product, data, width = 240 }: { product: CatalogProduct; data: MemberData; width?: number }) {
  const infoMode = !!product.infoMode;
  const bought = infoMode ? true : (product.checkBought ? product.checkBought(data) : false);
  const downloadUrl = bought && !infoMode ? product.getDownloadUrl?.(data) ?? null : null;

  return (
    <div style={{
      flexShrink: 0, width, scrollSnapAlign: "start",
      borderRadius: 20, overflow: "hidden",
      boxShadow: bought || infoMode
        ? "0 8px 32px rgba(0,0,0,.13)"
        : "0 4px 16px rgba(0,0,0,.09)",
      background: "#fff",
      border: bought && !infoMode ? "2px solid #002395" : "2px solid transparent",
      transition: "box-shadow .2s",
    }}>
      {/* Square image */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden" }}>
        {product.renderImage(bought)}
        {!bought && !infoMode && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(15,15,15,.5)",
            backdropFilter: "grayscale(1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              background: "rgba(255,255,255,.15)", borderRadius: "50%",
              width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 26 }}>🔒</span>
            </div>
          </div>
        )}
        {bought && !infoMode && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "#002395", borderRadius: 8, padding: "4px 9px",
          }}>
            <span style={{ color: "#FFDF00", fontSize: 10, fontWeight: 800, letterSpacing: ".04em" }}>✓ SEU</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px 18px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.25 }}>
          {product.name}
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
          {product.desc}
        </p>

        {infoMode ? (
          product.boughtExtra && <div>{product.boughtExtra}</div>
        ) : (
          <>
            {bought && product.boughtExtra && (
              <div style={{ marginBottom: 12 }}>{product.boughtExtra}</div>
            )}

            {bought && downloadUrl ? (
              <a
                href={downloadUrl}
                style={{
                  display: "block", textAlign: "center",
                  background: "#002395", color: "#fff",
                  borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 700,
                  textDecoration: "none", letterSpacing: ".03em",
                }}
              >⬇ {product.downloadLabel || "Download"}</a>
            ) : bought && !downloadUrl ? (
              <div style={{
                textAlign: "center", background: "#f0fdf4",
                color: "#166534", borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 700,
                border: "1px solid #bbf7d0",
              }}>{product.boughtMessage || "✓ Disponível"}</div>
            ) : product.acquireUrl ? (
              <a
                href={product.acquireUrl}
                style={{
                  display: "block", textAlign: "center",
                  background: "#FFDF00", color: "#002395",
                  borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 900,
                  textDecoration: "none", letterSpacing: ".03em",
                  boxShadow: "0 4px 12px rgba(255,223,0,.4)",
                }}
              >Adquira agora</a>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function PosterA4Card({ data, width = 250 }: { data: MemberData; width?: number }) {
  const bought = data.items.some(i =>
    i.offer_name?.toLowerCase().includes("poster") ||
    i.product_name?.toLowerCase().includes("poster") ||
    i.offer_name?.toLowerCase().includes("poste") ||
    i.product_name?.toLowerCase().includes("poste")
  );
  const stickerUrl = data.pedidos[0]?.sticker_url ?? null;

  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploadFileB, setUploadFileB] = useState<File | null>(null);
  const [uploadLoadingB, setUploadLoadingB] = useState(false);
  const [uploadErrorB, setUploadErrorB] = useState<string | null>(null);
  const inputRefB = useRef<HTMLInputElement>(null);

  const runGenerate = async (source: "auto" | File, layout: "grid" | "a4" = "grid") => {
    const isUpload = source instanceof File;
    const isB = layout === "a4";
    if (isUpload && isB) { setUploadLoadingB(true); setUploadErrorB(null); }
    else if (isUpload) { setUploadLoading(true); setUploadError(null); }
    else { setGenLoading(true); setGenError(null); }
    try {
      let file: File;
      if (isUpload) {
        file = source;
      } else {
        if (!stickerUrl) throw new Error("sem-url");
        const r = await fetch(`/api/download?url=${encodeURIComponent(stickerUrl)}&name=sticker`);
        if (!r.ok) throw new Error("fetch");
        const blob = await r.blob();
        file = new File([blob], "sticker.png", { type: blob.type || "image/png" });
      }
      const form = new FormData();
      form.append("file", file);
      form.append("layout", layout);
      const res = await fetch("/api/gerar-pdf", { method: "POST", body: form });
      if (!res.ok) throw new Error("pdf");
      const pdfBlob = await res.blob();
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = layout === "a4" ? "poster-completo-a4.pdf" : "poster-figurinha-4x4.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      if (isUpload && isB) setUploadErrorB("Falha ao gerar. Tente novamente.");
      else if (isUpload) setUploadError("Falha ao gerar. Tente novamente.");
      else setGenError("Falha ao gerar. Tente novamente.");
    } finally {
      if (isUpload && isB) setUploadLoadingB(false);
      else if (isUpload) setUploadLoading(false);
      else setGenLoading(false);
    }
  };

  const UploadSection = ({ file, setFile, loading, error, layout, inputR }: {
    file: File | null; setFile: (f: File | null) => void;
    loading: boolean; error: string | null;
    layout: "grid" | "a4"; inputR: React.RefObject<HTMLInputElement | null>;
  }) => (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#002395" }}>
        {layout === "a4" ? "📄 Poster Completo (A4)" : "🖼 Grade 4×4"}
      </p>
      <input ref={inputR} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
        onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div onClick={() => inputR.current?.click()} style={{
          flex: 1, border: "1.5px dashed #cbd5e1", borderRadius: 7, padding: "7px 6px",
          textAlign: "center", cursor: "pointer", background: "#f8fafc", minWidth: 0,
        }}>
          <p style={{ margin: 0, fontSize: 9, color: file ? "#334155" : "#94a3b8", fontWeight: file ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file ? file.name : "Selecionar imagem"}
          </p>
        </div>
        <button onClick={() => file && runGenerate(file, layout)} disabled={loading || !file} style={{
          flexShrink: 0, background: file ? "#002395" : "#f1f5f9",
          color: file ? "#fff" : "#94a3b8", border: "none", borderRadius: 7,
          padding: "7px 10px", fontSize: 11, fontWeight: 800,
          cursor: loading || !file ? "default" : "pointer", whiteSpace: "nowrap",
        }}>
          {loading ? "..." : "⬇ PDF"}
        </button>
      </div>
      {error && <p style={{ color: "#dc2626", fontSize: 10, margin: "3px 0 0" }}>{error}</p>}
    </div>
  );

  return (
    <div className="poster-card-outer" style={{
      flexShrink: 0, scrollSnapAlign: "start",
      borderRadius: 20, overflow: "hidden",
      boxShadow: bought ? "0 8px 32px rgba(0,0,0,.13)" : "0 4px 16px rgba(0,0,0,.09)",
      background: "#fff",
      border: bought ? "2px solid #002395" : "2px solid transparent",
    }}>
      <div className="poster-card-inner">
        {/* Image */}
        <div className="poster-card-image" style={{ position: "relative", overflow: "hidden", flexShrink: 0 }}>
          <ProductImg src="/Posterpdf.jpg" alt="Poster A4" bought={bought} />
          {!bought && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(15,15,15,.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ background: "rgba(255,255,255,.15)", borderRadius: "50%", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 26 }}>🔒</span>
              </div>
            </div>
          )}
          {bought && (
            <div style={{ position: "absolute", top: 10, right: 10, background: "#002395", borderRadius: 8, padding: "4px 9px" }}>
              <span style={{ color: "#FFDF00", fontSize: 10, fontWeight: 800, letterSpacing: ".04em" }}>✓ SEU</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "14px 16px 16px" }}>
          <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.25 }}>Poster A4</p>
          <p style={{ margin: "0 0 12px", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>PDF para imprimir e decorar em casa</p>

          {bought ? (
            <>
              <button onClick={() => runGenerate("auto")} disabled={genLoading || !stickerUrl} style={{
                width: "100%", background: "#002395", color: "#fff", border: "none",
                borderRadius: 10, padding: "10px 8px", fontSize: 13, fontWeight: 700,
                cursor: genLoading || !stickerUrl ? "default" : "pointer",
                opacity: genLoading || !stickerUrl ? 0.7 : 1, letterSpacing: ".03em",
              }}>
                {genLoading ? "Gerando PDF..." : "⬇ Baixar PDF 4×4"}
              </button>
              {genError && <p style={{ color: "#dc2626", fontSize: 11, margin: "4px 0 0", textAlign: "center" }}>{genError}</p>}

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1.5px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, color: "#64748b" }}>Gerar com outra foto:</p>
                <UploadSection file={uploadFile} setFile={setUploadFile} loading={uploadLoading} error={uploadError} layout="grid" inputR={inputRef} />
                <UploadSection file={uploadFileB} setFile={setUploadFileB} loading={uploadLoadingB} error={uploadErrorB} layout="a4" inputR={inputRefB} />
              </div>
            </>
          ) : (
            <a href="https://checkout.figurinhadacopadomundo.com/VCCL1O8SD2HR" style={{
              display: "block", textAlign: "center",
              background: "#FFDF00", color: "#002395",
              borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 900,
              textDecoration: "none", letterSpacing: ".03em",
              boxShadow: "0 4px 12px rgba(255,223,0,.4)",
            }}>Adquira agora</a>
          )}
        </div>
      </div>
    </div>
  );
}

function NeymarCard({ data, width = 250 }: { data: MemberData; width?: number }) {
  const bought = data.items.some(i =>
    i.offer_name?.toLowerCase().includes("neymar") ||
    i.product_name?.toLowerCase().includes("neymar") ||
    i.offer_name?.toLowerCase().includes("camisa") ||
    i.product_name?.toLowerCase().includes("camisa")
  );

  return (
    <div style={{
      flexShrink: 0, width, scrollSnapAlign: "start",
      borderRadius: 20, overflow: "hidden",
      boxShadow: bought ? "0 8px 32px rgba(0,0,0,.13)" : "0 4px 16px rgba(0,0,0,.09)",
      background: "#fff",
      border: bought ? "2px solid #002395" : "2px solid transparent",
    }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden" }}>
        <ProductImg src="/figurinhaney.jpg" alt="Figurinha Neymar" bought={bought} />
        {!bought && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(15,15,15,.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ background: "rgba(255,255,255,.15)", borderRadius: "50%", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 26 }}>🔒</span>
            </div>
          </div>
        )}
        {bought && (
          <div style={{ position: "absolute", top: 10, right: 10, background: "#002395", borderRadius: 8, padding: "4px 9px" }}>
            <span style={{ color: "#FFDF00", fontSize: 10, fontWeight: 800, letterSpacing: ".04em" }}>✓ SEU</span>
          </div>
        )}
      </div>
      <div style={{ padding: "16px 18px 18px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.25 }}>Figurinha Neymar</p>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>Figurinha exclusiva do neymar para download em PNG ou em PDF para impressão</p>
        {bought ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a
              href="/figurinhaneymar.png"
              download="figurinha-neymar.png"
              style={{
                display: "block", textAlign: "center",
                background: "#002395", color: "#fff",
                borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 700,
                textDecoration: "none", letterSpacing: ".03em",
              }}
            >⬇ Baixar PNG</a>
            <a
              href="/figurinha-neymar-impressão-grade-4x4.pdf"
              download="figurinha-neymar-grade-4x4.pdf"
              style={{
                display: "block", textAlign: "center",
                background: "#f8fafc", color: "#334155",
                borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 700,
                textDecoration: "none", border: "1px solid #e2e8f0",
              }}
            >📄 Baixar PDF</a>
          </div>
        ) : (
          <a
            href="https://checkout.figurinhadacopadomundo.com/VCCL1O8SD2HT"
            style={{
              display: "block", textAlign: "center",
              background: "#FFDF00", color: "#002395",
              borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 900,
              textDecoration: "none", letterSpacing: ".03em",
              boxShadow: "0 4px 12px rgba(255,223,0,.4)",
            }}
          >Adquira agora</a>
        )}
      </div>
    </div>
  );
}

function ProductRow({ title, accent, children }: { title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      {accent ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 2, background: "#0f172a", borderRadius: 2 }} />
          <h3 style={{
            color: "#fff", background: "#0f172a",
            fontWeight: 900, fontSize: 13,
            margin: 0, letterSpacing: ".12em",
            borderRadius: 99, padding: "8px 20px",
            textTransform: "uppercase" as const, whiteSpace: "nowrap",
          }}>
            {title}
          </h3>
          <div style={{ flex: 1, height: 2, background: "#0f172a", borderRadius: 2 }} />
        </div>
      ) : (
        <h3 style={{ color: "#0f172a", fontWeight: 900, fontSize: 22, margin: "0 0 18px", letterSpacing: "-.01em" }}>
          {title}
        </h3>
      )}
      <div className="product-row-scroll">
        {children}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function MembrosContent() {
  const searchParams = useSearchParams();
  const foneParam = searchParams.get("fone") || "";

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MemberData | null>(null);

  const fetchMember = async (fone: string) => {
    const digits = fone.replace(/\D/g, "");
    if (digits.length < 10) { setError("Digite um número de WhatsApp válido com DDD."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/membros?fone=${digits}`);
      if (res.status === 404) { setError("Nenhuma compra encontrada para esse número. Verifique se digitou corretamente."); setData(null); return; }
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError("Erro ao buscar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (foneParam) { setPhone(foneParam); fetchMember(foneParam); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foneParam]);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#FFDF00",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "40px 32px 64px",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "rgba(0,35,149,.12)", borderRadius: 12, padding: "8px 18px", marginBottom: 20,
        }}>
          <span style={{ fontSize: 18 }}>⚽</span>
          <span className="membros-badge" style={{ color: "#002395", fontWeight: 800, fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase" }}>
            Figurinha Copa 2026
          </span>
        </div>
        <h1 className="membros-h1" style={{ color: "#002395", fontSize: 28, fontWeight: 900, margin: "0 0 8px", letterSpacing: ".06em", whiteSpace: "nowrap" }}>
          ÁREA DE ENTREGÁVEIS
        </h1>
        <p style={{ color: "rgba(0,35,149,.6)", fontSize: 14, margin: 0, fontWeight: 500 }}>
          Acesse todos os seus produtos comprados
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 1200 }}>

        {/* ── Login ── */}
        {!data && (
          <div style={{
            background: "#fff", borderRadius: 20, padding: "32px 28px",
            boxShadow: "0 20px 60px rgba(0,0,0,.15)", marginBottom: 16, maxWidth: 460, margin: "0 auto 16px",
          }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🏆</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#002395", margin: "0 0 6px" }}>
                Entrar com seu WhatsApp
              </h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                Use o mesmo número cadastrado na compra
              </p>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="(11) 9 8765-4321"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              onKeyDown={e => e.key === "Enter" && fetchMember(phone)}
              style={{
                width: "100%", boxSizing: "border-box",
                border: "2px solid #e2e8f0", borderRadius: 12, padding: "14px 16px",
                fontSize: 16, outline: "none", marginBottom: 12, color: "#0f172a", fontFamily: "inherit",
              }}
            />
            {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</p>}
            <button
              onClick={() => fetchMember(phone)}
              disabled={loading}
              style={{
                width: "100%", background: "#002395", color: "#fff", border: "none",
                borderRadius: 12, padding: "15px 20px", fontSize: 15, fontWeight: 800,
                cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
                letterSpacing: ".06em", textTransform: "uppercase",
              }}
            >
              {loading ? "Buscando..." : "ACESSAR MEUS PRODUTOS →"}
            </button>
          </div>
        )}

        {/* ── Member area ── */}
        {data && (
          <>
            {/* Welcome bar */}
            <div style={{
              background: "#0f172a",
              borderRadius: 18, padding: "20px 24px",
              marginBottom: 36,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: "0 8px 32px rgba(0,0,0,.2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "#FFDF00",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0,
                }}>⚽</div>
                <div>
                  <p style={{ color: "rgba(255,255,255,.5)", fontSize: 11, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>
                    Área de membros
                  </p>
                  <p style={{ color: "#fff", fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: "-.01em" }}>
                    {data.nome || "Cliente"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setData(null); setPhone(""); }}
                style={{
                  background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)",
                  border: "1px solid rgba(255,255,255,.15)",
                  borderRadius: 10, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600,
                }}
              >
                Trocar número
              </button>
            </div>

            {/* Row 1 — Figurinhas personalizadas */}
            {data.pedidos.length > 0 && (
              <ProductRow title={`Suas Figurinhas (${data.pedidos.length})`}>
                {data.pedidos.map(p => <StickerCard key={p.id} pedido={p} />)}
              </ProductRow>
            )}

            {/* Row 2 — Produtos principais */}
            <ProductRow title="Produtos Copa 2026">
              {CATALOG.filter(p => p.section === "main").map(product =>
                product.renderCard
                  ? <div key={product.id} style={{ flexShrink: 0, scrollSnapAlign: "start" }}>{product.renderCard(data, 250)}</div>
                  : <CatalogCard key={product.id} product={product} data={data} width={250} />
              )}
            </ProductRow>

            {/* Row 3 — Aumente suas chances */}
            <ProductRow title="AUMENTE SUAS CHANCES NO SORTEIO" accent>
              {CATALOG.filter(p => p.section === "sorteio").map(product =>
                product.renderCard
                  ? <div key={product.id} style={{ flexShrink: 0, scrollSnapAlign: "start" }}>{product.renderCard(data, 240)}</div>
                  : <CatalogCard key={product.id} product={product} data={data} width={240} />
              )}
            </ProductRow>

            {/* Support */}
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <a
                href="https://api.whatsapp.com/send?phone=559294621319&text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20minha%20compra."
                target="_blank" rel="noopener noreferrer"
                style={{ color: "rgba(0,35,149,.5)", fontSize: 13, textDecoration: "underline", fontWeight: 500 }}
              >
                Problema com algum produto? Fale com o suporte
              </a>
            </div>
          </>
        )}
      </div>

      <style>{`
        div::-webkit-scrollbar { display: none; }

        .product-row-scroll {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          padding-bottom: 12px;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }
        .product-row-scroll > div {
          flex-shrink: 0;
          scroll-snap-align: start;
        }

        .poster-card-outer { width: 250px; }
        .poster-card-inner { display: flex; flex-direction: column; }
        .poster-card-image { width: 100%; aspect-ratio: 3/4; }

        @media (max-width: 640px) {
          .product-row-scroll {
            display: flex;
            flex-direction: column;
            overflow-x: visible;
            scroll-snap-type: none;
            gap: 14px;
            padding-bottom: 0;
          }
          .product-row-scroll > div {
            width: 100% !important;
            flex-shrink: unset;
          }
          .membros-badge {
            font-size: 9px !important;
            padding: 5px 10px !important;
          }
          .membros-h1 {
            font-size: 20px !important;
            letter-spacing: .02em !important;
          }
        }
      `}</style>
    </main>
  );
}

export default function Membros() {
  return (
    <Suspense>
      <MembrosContent />
    </Suspense>
  );
}
