"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/track";

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 404) throw new Error("not_found");
    } catch (e) {
      if (e instanceof Error && e.message === "not_found") throw e;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw new Error("Falhou após tentativas");
}


const FAQ_ITEMS = [
  {
    q: "Quando vou receber minha figurinha?",
    a: "Sua figurinha é gerada automaticamente aqui nesta página e se não apareceu você também pode baixar nesta página colocando seu número no formulário.",
  },
  {
    q: "Comprei mais de 1 produto",
    a: "Use o bloco 'Comprou mais de 1 produto?' abaixo, digite seu número e acesse a área de entregáveis com todos os seus produtos.",
  },
  {
    q: "Como baixo minha figurinha?",
    a: "Clique no botão '⬇ BAIXAR MINHA FIGURINHA' que aparece abaixo da imagem. O arquivo será salvo no seu celular ou computador.",
  },
  {
    q: "Posso usar em qualquer álbum?",
    a: "Sua figurinha é uma imagem digital (PNG) pronta para compartilhar no WhatsApp, redes sociais ou imprimir em casa.",
  },
];

function FaqBubble() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [labelVisible, setLabelVisible] = useState(false);

  // Balão "Alguma dúvida?" aparece após 8s e some após 6s
  useEffect(() => {
    const show = setTimeout(() => setLabelVisible(true), 8000);
    const hide = setTimeout(() => setLabelVisible(false), 14000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  return (
    <>
      {/* Floating button */}
      <div style={{ position: "fixed", bottom: 24, right: 20, zIndex: 1000, display: "flex", alignItems: "center", gap: 12 }}>
        {/* Label bubble */}
        {labelVisible && !open && (
          <div style={{
            background: "#fff", color: "#002395", fontWeight: 700, fontSize: 13,
            borderRadius: 20, padding: "8px 14px", boxShadow: "0 4px 20px rgba(0,0,0,.25)",
            whiteSpace: "nowrap", animation: "fadeInLabel .3s ease",
          }}>
            Alguma dúvida?
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => { setOpen(o => !o); setLabelVisible(false); }}
            className="faq-bubble-btn"
            style={{
              borderRadius: "50%", border: "none", cursor: "pointer",
              background: "#002395",
              boxShadow: "0 6px 28px rgba(0,35,149,.55)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0, overflow: "hidden",
              transition: "transform .2s",
            }}
            aria-label="Dúvidas frequentes"
          >
            {open ? (
              <span style={{ color: "#fff", fontSize: 28, fontWeight: 700 }}>✕</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/fotosuporte.png"
                alt="Suporte"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
          </button>
          <div style={{
            background: "#002395", color: "#fff",
            fontSize: 10, fontWeight: 800, letterSpacing: ".08em",
            borderRadius: 6, padding: "3px 10px",
          }}>
            SUPORTE
          </div>
        </div>
      </div>

      {/* FAQ panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 140, right: 20, zIndex: 999,
          width: "min(340px, calc(100vw - 40px))",
          background: "#fff", borderRadius: 20,
          boxShadow: "0 8px 40px rgba(0,0,0,.35)",
          overflow: "hidden", animation: "slideUp .25s ease",
        }}>
          <div style={{ background: "linear-gradient(135deg, #002395, #0040cc)", padding: "16px 20px" }}>
            <p style={{ color: "#fff", fontWeight: 800, fontSize: 15, margin: 0 }}>Perguntas frequentes</p>
            <p style={{ color: "rgba(255,255,255,.65)", fontSize: 12, margin: "2px 0 0" }}>Respostas rápidas para você</p>
          </div>
          <div style={{ padding: "8px 0", maxHeight: 340, overflowY: "auto" }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} style={{ borderBottom: i < FAQ_ITEMS.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  style={{
                    width: "100%", background: "none", border: "none", cursor: "pointer",
                    padding: "14px 20px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{item.q}</span>
                  <span style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>{expanded === i ? "▲" : "▼"}</span>
                </button>
                {expanded === i && (
                  <p style={{ margin: 0, padding: "0 20px 14px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
            <a
              href="https://api.whatsapp.com/send?phone=559294621319&text=Ol%C3%A1%2C%20comprei%20uma%20figurinha%20e%20preciso%20de%20ajuda."
              target="_blank" rel="noopener noreferrer"
              style={{ color: "#25d366", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
            >
              💬 Falar com suporte
            </a>
          </div>
        </div>
      )}
    </>
  );
}

export default function Obrigado() {
  const router = useRouter();

  // — Figurinha —
  const [stickerUrl, setStickerUrl]     = useState<string | null>(null);
  const [stickerLoading, setStickerLoading] = useState(true);

  // — Buscar figurinha por telefone —
  const [searchPhone, setSearchPhone]   = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError]   = useState<string | null>(null);

  // — Área de membros —
  const [memberPhone, setMemberPhone]   = useState("");
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError]   = useState<string | null>(null);

  useEffect(() => {
    track("obrigado");
  }, []);

  // Load sticker
  useEffect(() => {
    const urlFromSession = (() => { try { return sessionStorage.getItem("figurinha_sticker_url"); } catch { return null; } })();
    if (urlFromSession) { setStickerUrl(urlFromSession); setStickerLoading(false); return; }

    const params = new URLSearchParams(window.location.search);

    const foneParam = params.get("fone");
    if (foneParam && foneParam.length <= 20) {
      const digits = foneParam.replace(/\D/g, "").slice(0, 15);
      fetchWithRetry(`/api/sticker?email=${encodeURIComponent(digits)}`)
        .then(r => r.json()).then(d => { if (d.url) setStickerUrl(d.url); }).catch(() => {})
        .finally(() => setStickerLoading(false));
      return;
    }

    const emailParam = params.get("email");
    if (emailParam) {
      fetchWithRetry(`/api/sticker?email=${encodeURIComponent(emailParam)}`)
        .then(r => r.json()).then(d => { if (d.url) setStickerUrl(d.url); }).catch(() => {})
        .finally(() => setStickerLoading(false));
      return;
    }

    const id =
      params.get("src") ||
      (() => { try { return sessionStorage.getItem("figurinha_sticker_id"); } catch { return null; } })() ||
      (() => { try { return localStorage.getItem("figurinha_sticker_id"); } catch { return null; } })();

    if (!id) { setStickerLoading(false); return; }

    fetchWithRetry(`/api/sticker?id=${encodeURIComponent(id)}`)
      .then(r => r.json()).then(d => { if (d.url) setStickerUrl(d.url); }).catch(() => {})
      .finally(() => setStickerLoading(false));
  }, []);

  const handleBuscarFigurinha = async () => {
    const digits = searchPhone.replace(/\D/g, "");
    if (digits.length < 10) { setSearchError("Digite um telefone válido com DDD."); return; }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/sticker?email=${encodeURIComponent(digits)}`);
      const data = await res.json();
      if (data.url) { setStickerUrl(data.url); setSearchError(null); }
      else setSearchError("Figurinha não encontrada. Verifique o número e tente novamente.");
    } catch {
      setSearchError("Erro ao buscar. Tente novamente.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDownload = () => {
    if (!stickerUrl) return;
    const a = document.createElement("a");
    if (stickerUrl.startsWith("data:")) {
      a.href = stickerUrl;
      a.download = "minha-figurinha-copa2026.png";
    } else {
      a.href = `/api/download?url=${encodeURIComponent(stickerUrl)}&name=minha-figurinha-copa2026`;
    }
    a.click();
  };

  const handleMemberLogin = async () => {
    const digits = memberPhone.replace(/\D/g, "");
    if (digits.length < 10) { setMemberError("Digite um telefone válido com DDD."); return; }
    setMemberLoading(true);
    setMemberError(null);
    try {
      const res = await fetch(`/api/membros?fone=${digits}`);
      if (res.status === 404) { setMemberError("Nenhuma compra encontrada para esse número."); return; }
      if (!res.ok) throw new Error();
      router.push(`/membros?fone=${digits}`);
    } catch {
      setMemberError("Erro ao verificar. Tente novamente.");
    } finally {
      setMemberLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#FFDF00",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "36px 16px 56px",
    }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "rgba(0,35,149,.12)", borderRadius: 12, padding: "8px 18px", marginBottom: 20,
        }}>
          <span style={{ fontSize: 20 }}>⚽</span>
          <span style={{ color: "#002395", fontWeight: 800, fontSize: 13, letterSpacing: ".1em" }}>FIGURINHA COPA 2026</span>
        </div>
        <h1 style={{
          color: "#002395", fontSize: "clamp(36px, 8vw, 64px)", fontWeight: 900,
          margin: "0 0 10px", letterSpacing: ".08em",
          fontFamily: "var(--font-titulo, 'Arial Black', sans-serif)",
        }}>
          OBRIGADO!
        </h1>
        <p style={{ color: "#002395", fontSize: 16, margin: 0, fontWeight: 600 }}>
          Seu pagamento foi confirmado ✓
        </p>
      </div>

      {/* Card Segunda Figurinha */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 20, position: "relative" }}>
        {/* Glow atrás */}
        <div className="segunda-glow" />
        {/* Borda animada */}
        <div className="segunda-border">
          <div style={{
            background: "#fff", borderRadius: 16,
            padding: "18px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: ".08em", textTransform: "uppercase" }}>
                Oferta exclusiva
              </p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#002395", lineHeight: 1.25 }}>
                Gere sua segunda figurinha por apenas{" "}
                <span style={{ color: "#009C3B" }}>R$7,90</span>
              </p>
            </div>
            <a
              href="/?start=1"
              onClick={() => {
                try {
                  const sid = sessionStorage.getItem("_fsid");
                  if (sid) navigator.sendBeacon("/api/track", new Blob(
                    [JSON.stringify({ session_id: sid, step: "segunda_obg" })],
                    { type: "application/json" }
                  ));
                  sessionStorage.removeItem("figurinha_sticker_url");
                  sessionStorage.removeItem("figurinha_sticker_id");
                } catch { /* ignore */ }
              }}
              style={{
                flexShrink: 0,
                display: "inline-block",
                background: "linear-gradient(135deg, #002395, #0040CC)",
                color: "#FFDF00",
                borderRadius: 12,
                padding: "12px 18px",
                fontSize: 13,
                fontWeight: 900,
                textDecoration: "none",
                letterSpacing: ".04em",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 16px rgba(0,35,149,.35)",
              }}
            >
              QUERO! ⚽
            </a>
          </div>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── BLOCO 1: Figurinha + Não recebeu ── */}
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>

          {/* Figurinha preview */}
          {(stickerLoading || stickerUrl) && (
            <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "24px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              {stickerLoading ? (
                <div style={{ width: 120, height: 180, borderRadius: 12, background: "#e2e8f0", animation: "pulse 1.5s ease-in-out infinite" }} />
              ) : stickerUrl ? (
                <>
                  <div style={{ width: 140, borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,35,.2)", border: "3px solid #002395" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stickerUrl} alt="Sua figurinha" style={{ width: "100%", height: "auto", display: "block" }} />
                  </div>
                  <button
                    onClick={handleDownload}
                    style={{
                      background: "#002395", color: "#fff", border: "none", borderRadius: 12,
                      padding: "13px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer",
                      letterSpacing: ".06em", textTransform: "uppercase",
                    }}
                  >
                    ⬇ BAIXAR MINHA FIGURINHA
                  </button>
                </>
              ) : null}
            </div>
          )}

          {/* Não recebeu */}
          <div style={{ padding: "24px 28px" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#002395", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
              📱 Não recebeu a figurinha?
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 14px" }}>
              {stickerUrl
                ? "Sua figurinha está aparecendo acima. Use o botão para baixar."
                : "Digite seu número de WhatsApp para encontrá-la (SEM +55)."}
            </p>

            {!stickerUrl && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Ex: 11998765432"
                  value={searchPhone}
                  maxLength={15}
                  disabled={searchLoading}
                  aria-label="Número de WhatsApp para buscar figurinha"
                  onChange={e => setSearchPhone(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handleBuscarFigurinha()}
                  style={{
                    flex: "1 1 180px", border: "2px solid #e2e8f0", borderRadius: 10,
                    padding: "11px 14px", fontSize: 14, outline: "none", color: "#0f172a",
                  }}
                />
                <button
                  onClick={handleBuscarFigurinha}
                  disabled={searchLoading}
                  style={{
                    background: "#002395", color: "#fff", border: "none", borderRadius: 10,
                    padding: "11px 18px", fontSize: 13, fontWeight: 700, cursor: searchLoading ? "default" : "pointer",
                    opacity: searchLoading ? 0.7 : 1, whiteSpace: "nowrap",
                  }}
                >
                  {searchLoading ? "..." : "Buscar"}
                </button>
              </div>
            )}

            {searchError && (
              <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{searchError}</p>
            )}
          </div>
        </div>

        {/* ── BLOCO 2: Área de membros ── */}
        <div style={{
          background: "#fff",
          borderRadius: 20, padding: "24px 28px",
          boxShadow: "0 20px 60px rgba(0,0,0,.15)",
          border: "2px solid #002395",
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#002395", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
            🏆 Comprou mais de 1 produto?
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
            Logue em nossa área de entregáveis com o seu número para acessar todos os seus produtos.
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Ex: 11998765432"
              value={memberPhone}
              maxLength={15}
              disabled={memberLoading}
              aria-label="Número de WhatsApp para acessar área de membros"
              onChange={e => setMemberPhone(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleMemberLogin()}
              style={{
                flex: "1 1 180px", border: "2px solid #e2e8f0", borderRadius: 10,
                padding: "11px 14px", fontSize: 14, outline: "none", color: "#0f172a",
              }}
            />
            <button
              onClick={handleMemberLogin}
              disabled={memberLoading}
              style={{
                background: "#FFDF00", color: "#002395", border: "none", borderRadius: 10,
                padding: "11px 18px", fontSize: 13, fontWeight: 800, cursor: memberLoading ? "default" : "pointer",
                opacity: memberLoading ? 0.7 : 1, whiteSpace: "nowrap",
              }}
            >
              {memberLoading ? "..." : "ENTRAR →"}
            </button>
          </div>

          {memberError && (
            <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{memberError}</p>
          )}
        </div>

        {/* CTA criar nova */}
        <a
          href="/"
          onClick={() => {
            try { localStorage.removeItem("figurinha_sticker_id"); } catch { /* ignore */ }
            try { sessionStorage.removeItem("figurinha_sticker_url"); sessionStorage.removeItem("figurinha_sticker_id"); } catch { /* ignore */ }
          }}
          style={{
            display: "block", textAlign: "center",
            color: "rgba(0,35,149,.45)", fontSize: 13,
            textDecoration: "underline", padding: "8px",
          }}
        >
          Criar nova figurinha
        </a>
      </div>

      <FaqBubble />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        @keyframes fadeInLabel {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .faq-bubble-btn { width: 46px; height: 46px; }
        @media (min-width: 641px) { .faq-bubble-btn { width: 92px; height: 92px; } }

        @keyframes borderSpin {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: .55; transform: scale(1); }
          50%       { opacity: .85; transform: scale(1.04); }
        }
        .segunda-border {
          padding: 3px;
          border-radius: 18px;
          background: linear-gradient(270deg, #002395, #009C3B, #FFDF00, #EF4444, #002395);
          background-size: 300% 300%;
          animation: borderSpin 4s ease infinite;
        }
        .segunda-glow {
          position: absolute;
          inset: -6px;
          border-radius: 24px;
          background: linear-gradient(270deg, #002395, #009C3B, #FFDF00, #EF4444);
          background-size: 300% 300%;
          animation: borderSpin 4s ease infinite, glowPulse 3s ease-in-out infinite;
          filter: blur(14px);
          z-index: 0;
        }
        .segunda-border { position: relative; z-index: 1; }
      `}</style>
    </main>
  );
}
