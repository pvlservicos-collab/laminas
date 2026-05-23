"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

interface ResultScreenProps {
  stickerUrl: string;
  stickerId: string;
  onRetry: () => void;
  onCheckout?: () => void;
  checkoutUrl?: string;
  price?: string;
}

export default function ResultScreen({ stickerUrl, stickerId, onRetry, onCheckout, checkoutUrl: checkoutUrlProp, price }: ResultScreenProps) {
  const handleCheckout = () => {
    onCheckout?.();
    track("checkout");
    sessionStorage.removeItem("figurinha_sticker_url");
    sessionStorage.removeItem("figurinha_sticker_id");
    try { localStorage.setItem("figurinha_sticker_id", stickerId); } catch { /* ignore */ }
    const checkoutUrl = checkoutUrlProp || process.env.NEXT_PUBLIC_CHECKOUT_URL || "https://checkout.figurinhadacopadomundo.com/VCCL1O8SD2DW";

    const params = new URLSearchParams(window.location.search);
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ttclid", "sck", "src"];
    const utms: string[] = [];

    for (const key of utmKeys) {
      let val = params.get(key);
      if (!val) {
        const cookie = document.cookie.split(";").find(c => c.trim().startsWith(`${key}=`));
        if (cookie) val = cookie.split("=")[1];
      }
      if (!val) {
        try { val = localStorage.getItem(key); } catch { /* ignore */ }
      }
      if (val && key !== "src") utms.push(`${key}=${encodeURIComponent(val)}`);
    }

    const separator = checkoutUrl.includes("?") ? "&" : "?";
    const utmString = utms.length > 0 ? `&${utms.join("&")}` : "";
    window.location.href = `${checkoutUrl}${separator}src=${stickerId}${utmString}`;
  };

  useEffect(() => {
    const preventContext = (e: MouseEvent) => e.preventDefault();
    const preventKeys = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === "s" || e.key === "u" || e.key === "S" || e.key === "U")) ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "C" || e.key === "c")) ||
        e.key === "F12" ||
        e.key === "PrintScreen"
      ) {
        e.preventDefault();
      }
    };
    const preventDrag = (e: DragEvent) => e.preventDefault();
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    document.addEventListener("contextmenu", preventContext);
    document.addEventListener("keydown", preventKeys);
    document.addEventListener("dragstart", preventDrag);
    document.addEventListener("touchmove", preventZoom, { passive: false });

    return () => {
      document.removeEventListener("contextmenu", preventContext);
      document.removeEventListener("keydown", preventKeys);
      document.removeEventListener("dragstart", preventDrag);
      document.removeEventListener("touchmove", preventZoom);
    };
  }, []);

  return (
    <section
      className="flex flex-col items-center min-h-[100dvh] w-full px-4 py-8 justify-center"
      style={{ background: "#006847", userSelect: "none", WebkitUserSelect: "none" }}
    >
      {!stickerUrl ? (
        <div className="bg-white rounded-2xl p-8 text-center border-4 max-w-sm w-full animate-slide-up" style={{ borderColor: "#CE1126" }}>
          <p className="text-4xl mb-3">⏳</p>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "var(--font-titulo)", color: "#006847" }}
          >
            INTENTA DE NUEVO
          </h2>
          <p className="text-base text-gray-600 mb-2" style={{ fontFamily: "var(--font-papernotes)" }}>
            A veces los servidores de OpenAI se saturan.
          </p>
          <p className="text-base text-gray-600 mb-6" style={{ fontFamily: "var(--font-papernotes)" }}>
            Haz clic en intentar de nuevo y se generará automáticamente.
          </p>
          <button
            onClick={onRetry}
            className="w-full text-white font-bold text-lg py-4 rounded-2xl
              shadow-lg active:scale-95 transition-all duration-200 cursor-pointer tracking-[0.1em]"
            style={{ fontFamily: "var(--font-titulo)", background: "#CE1126" }}
          >
            INTENTAR DE NUEVO
          </button>
        </div>
      ) : (
        <>
        <div className="flex flex-col items-center w-full max-w-sm animate-slide-up">

          {/* Barra de progresso */}
          <div className="w-full px-1 mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-papernotes)" }}>
                ¡Ya creaste tu cromo! 🔥
              </span>
              <span className="text-sm font-black" style={{ fontFamily: "var(--font-titulo)", color: "#CE1126" }}>95%</span>
            </div>
            <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.25)" }}>
              <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: "95%", background: "#CE1126" }} />
            </div>
            <p className="text-xs mt-1 text-right text-white opacity-60" style={{ fontFamily: "var(--font-papernotes)" }}>solo falta confirmar</p>
          </div>

          {/* Preview */}
          <div
            className="relative w-56 md:w-64 rounded-xl overflow-hidden shadow-2xl border-4 mb-6"
            style={{ borderColor: "#CE1126" }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stickerUrl}
              alt="Cromo personalizado"
              className="w-full aspect-[2/3] object-cover"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                pointerEvents: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
              }}
            />
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ background: "rgba(0,0,0,0.04)" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="rotate-[-30deg] absolute w-[200%]" style={{ top: `${i * 22 - 10}%`, left: "-30%" }}>
                  <p className="text-white text-xl font-black tracking-[0.3em] whitespace-nowrap"
                    style={{ fontFamily: "var(--font-titulo)", textShadow: "1px 1px 4px rgba(0,0,0,0.4)", opacity: 0.3 }}>
                    PREVIEW &nbsp; PREVIEW &nbsp; PREVIEW
                  </p>
                  <p className="text-white text-[9px] font-bold tracking-widest whitespace-nowrap mt-1"
                    style={{ fontFamily: "var(--font-papernotes)", textShadow: "1px 1px 3px rgba(0,0,0,0.3)", opacity: 0.25 }}>
                    mi-cromo-copa2026 &nbsp;&nbsp; mi-cromo-copa2026 &nbsp;&nbsp; mi-cromo-copa2026
                  </p>
                </div>
              ))}
            </div>
            <div className="absolute inset-0" />
          </div>

          {/* ¡GOOOL! */}
          <h1
            className="text-6xl md:text-8xl text-center tracking-[0.1em] mb-1"
            style={{ fontFamily: "var(--font-titulo)", fontWeight: 400, color: "#ffffff" }}
          >
            ¡GOOOL!
          </h1>

          <p
            className="text-lg md:text-xl text-white text-center font-bold mb-2"
            style={{ fontFamily: "var(--font-papernotes)" }}
          >
            ¡Tu cromo está listo!
          </p>

          <p
            className="text-base text-center mb-6"
            style={{ fontFamily: "var(--font-papernotes)", color: "rgba(255,255,255,0.85)" }}
          >
            Obtén tu cromo HOY y participa por $1,000 dólares<br />Sorteo el día 11/06/2026
          </p>

          {/* Precio */}
          <p
            className="text-5xl md:text-6xl text-center mb-6 relative inline-block shine-effect"
            style={{ fontFamily: "'Montserrat', Arial Black, sans-serif", fontWeight: 900, color: "#ffffff" }}
          >
            {price || "$4.90 USD"}
          </p>

          {/* Botón */}
          <button
            onClick={handleCheckout}
            className="w-full text-white font-bold text-xl md:text-2xl py-5 rounded-2xl
              active:scale-95 transition-all duration-200 cursor-pointer tracking-[0.15em] relative overflow-hidden"
            style={{
              fontFamily: "var(--font-titulo)",
              background: "linear-gradient(135deg, #CE1126 0%, #ff2a47 50%, #CE1126 100%)",
              boxShadow: "0 6px 24px rgba(206,17,38,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              ⚽ RECIBIR MI CROMO
            </span>
          </button>

          <p className="text-sm text-center mt-3" style={{ fontFamily: "var(--font-papernotes)", color: "rgba(255,255,255,0.75)" }}>
            ✅ Incluye descarga en alta calidad
          </p>
        </div>

        {/* Depoimentos */}
        <div className="depoimentos-wrap mt-6 flex flex-col gap-2 px-4">
          <p className="text-xs text-center font-bold tracking-widest uppercase text-white opacity-60" style={{ fontFamily: "var(--font-papernotes)" }}>
            Lo que están diciendo
          </p>
          <div className="depoimentos-grid">
            {["/dd1.png", "/dd2.png", "/dd3.png"].map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`Testimonio ${i + 1}`} className="rounded-lg shadow-md w-full" draggable={false} />
            ))}
          </div>
        </div>

        <style>{`
          .depoimentos-wrap { width: min(360px, 90vw); }
          .depoimentos-grid { display: flex; flex-direction: column-reverse; gap: 10px; }
          @media (min-width: 641px) {
            .depoimentos-wrap { width: min(680px, 90vw); }
            .depoimentos-grid { flex-direction: row; gap: 12px; }
            .depoimentos-grid img { flex: 1; min-width: 0; }
          }
        `}</style>
        </>
      )}
    </section>
  );
}
