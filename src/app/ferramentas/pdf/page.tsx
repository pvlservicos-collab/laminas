"use client";

import { useState, useRef } from "react";

export default function GerarPdf() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<"a4" | "grid" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Envie uma imagem PNG ou JPG."); return; }
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleGenerate = async (layout: "a4" | "grid") => {
    if (!file) { setError("Selecione uma imagem primeiro."); return; }
    setLoading(layout);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("layout", layout);
      const res = await fetch("/api/gerar-pdf", { method: "POST", body: form });
      if (!res.ok) throw new Error("Erro ao gerar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = layout === "a4" ? "figurinha-a4-completo.pdf" : "figurinha-grade-4x4.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Falha ao gerar PDF. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main style={{
      minHeight: "100vh", background: "#FFDF00",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 20px 64px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "rgba(0,35,149,.12)", borderRadius: 12, padding: "8px 18px", marginBottom: 18,
        }}>
          <span style={{ fontSize: 18 }}>⚽</span>
          <span style={{ color: "#002395", fontWeight: 800, fontSize: 13, letterSpacing: ".1em" }}>FIGURINHA COPA 2026</span>
        </div>
        <h1 style={{ color: "#002395", fontSize: 28, fontWeight: 900, margin: "0 0 8px", letterSpacing: ".06em" }}>
          GERAR PDF
        </h1>
        <p style={{ color: "rgba(0,35,149,.6)", fontSize: 14, margin: 0, fontWeight: 500 }}>
          Faça upload da figurinha e baixe o PDF pronto para impressão
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Upload area */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{
            background: "#fff", borderRadius: 20,
            boxShadow: "0 8px 32px rgba(0,0,0,.12)",
            padding: "28px 24px",
            cursor: "pointer",
            border: "2px dashed rgba(0,35,149,.2)",
            transition: "border-color .2s",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="preview"
                style={{
                  width: 120, height: 180, objectFit: "cover",
                  borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,35,.2)",
                  border: "3px solid #002395",
                }}
              />
              <p style={{ color: "#002395", fontSize: 13, fontWeight: 700, margin: 0 }}>
                {file?.name}
              </p>
              <p style={{ color: "rgba(0,35,149,.5)", fontSize: 12, margin: 0 }}>
                Clique para trocar a imagem
              </p>
            </>
          ) : (
            <>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: "rgba(0,35,149,.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28,
              }}>📤</div>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#002395", fontWeight: 800, fontSize: 15, margin: "0 0 4px" }}>
                  Upload da figurinha
                </p>
                <p style={{ color: "rgba(0,35,149,.5)", fontSize: 13, margin: 0 }}>
                  Clique ou arraste a imagem aqui
                </p>
                <p style={{ color: "rgba(0,35,149,.4)", fontSize: 11, margin: "4px 0 0" }}>
                  PNG ou JPG
                </p>
              </div>
            </>
          )}
        </div>

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, textAlign: "center", margin: 0 }}>{error}</p>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* A4 completo */}
          <button
            onClick={() => handleGenerate("a4")}
            disabled={!!loading || !file}
            style={{
              background: "#002395", color: "#fff", border: "none", borderRadius: 14,
              padding: "16px 20px", fontSize: 14, fontWeight: 800, cursor: (!loading && file) ? "pointer" : "default",
              opacity: (!loading && file) ? 1 : 0.55,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              letterSpacing: ".05em",
            }}
          >
            {loading === "a4" ? (
              <span>Gerando...</span>
            ) : (
              <>
                <span style={{ fontSize: 20 }}>📄</span>
                <div style={{ textAlign: "left" }}>
                  <div>A4 COMPLETO</div>
                  <div style={{ fontSize: 11, fontWeight: 500, opacity: .75 }}>Uma figurinha centralizada na folha</div>
                </div>
              </>
            )}
          </button>

          {/* Grade 3x3 */}
          <button
            onClick={() => handleGenerate("grid")}
            disabled={!!loading || !file}
            style={{
              background: "#fff", color: "#002395", border: "2.5px solid #002395", borderRadius: 14,
              padding: "16px 20px", fontSize: 14, fontWeight: 800, cursor: (!loading && file) ? "pointer" : "default",
              opacity: (!loading && file) ? 1 : 0.55,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              letterSpacing: ".05em",
            }}
          >
            {loading === "grid" ? (
              <span>Gerando...</span>
            ) : (
              <>
                <span style={{ fontSize: 20 }}>🔲</span>
                <div style={{ textAlign: "left" }}>
                  <div>GRADE 4 × 4</div>
                  <div style={{ fontSize: 11, fontWeight: 500, opacity: .65 }}>16 figurinhas com linhas de corte</div>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div style={{
          background: "rgba(0,35,149,.08)", borderRadius: 12, padding: "14px 16px",
        }}>
          <p style={{ color: "#002395", fontSize: 12, margin: "0 0 6px", fontWeight: 700 }}>ℹ️ Como usar</p>
          <ul style={{ color: "rgba(0,35,149,.7)", fontSize: 12, margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Envie a imagem da figurinha gerada</li>
            <li><strong>A4 Completo</strong> — figurinha única centralizada, ideal para poster</li>
            <li><strong>Grade 3×3</strong> — 9 cópias com marcas de corte, 6×9 cm cada</li>
            <li>O PDF gerado está em tamanho real (A4), pronto para impressão</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
