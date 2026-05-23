"use client";

import { useEffect, useRef } from "react";

const RECENTES = ["/f1.webp", "/f2.webp", "/f3.webp", "/f4.webp"];

function FigurinhasCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame: number;
    let x = 0;
    const speed = 0.18;
    const totalWidth = track.scrollWidth / 2;
    const tick = () => {
      x -= speed;
      if (Math.abs(x) >= totalWidth) x = 0;
      track.style.transform = `translateX(${x}px)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const items = [...RECENTES, ...RECENTES];

  return (
    <div className="w-full overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
      <div ref={trackRef} className="flex gap-3" style={{ width: "max-content", willChange: "transform" }}>
        {items.map((src, i) => (
          <div key={i} className="flex-shrink-0 w-20 rounded-lg overflow-hidden shadow-md" style={{ opacity: 0.5, aspectRatio: "2/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  imageUrl: string | null;
  nome: string | null;
  stickerId: string;
}

export default function PreviewDescontoClient({ imageUrl, nome, stickerId }: Props) {
  const handleCheckout = () => {
    const checkoutUrl = "https://checkout.figurinhadacopadomundo.com/VCCL1O8SD2GE";
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
        e.key === "F12" || e.key === "PrintScreen"
      ) e.preventDefault();
    };
    const preventDrag = (e: DragEvent) => e.preventDefault();
    const preventZoom = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };

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
      style={{ background: "#FFDF00", userSelect: "none", WebkitUserSelect: "none" }}
    >
      <div className="flex flex-col items-center w-full max-w-sm animate-slide-up">

        {/* Barra de progresso */}
        <div className="w-full px-1 mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold text-copa-blue" style={{ fontFamily: "var(--font-papernotes)" }}>
              Você já criou sua figurinha 🔥
            </span>
            <span className="text-sm font-black text-copa-green" style={{ fontFamily: "var(--font-titulo)" }}>95%</span>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "rgba(0,35,149,0.15)" }}>
            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: "95%", background: "linear-gradient(90deg, #009C3B, #00c94d)" }} />
          </div>
          <p className="text-xs mt-1 text-right" style={{ fontFamily: "var(--font-papernotes)", color: "rgba(0,35,149,0.5)" }}>só falta confirmar</p>
        </div>

        {/* Preview da figurinha */}
        <div
          className="relative w-56 md:w-64 rounded-xl overflow-hidden shadow-2xl border-3 border-copa-blue mb-6"
          onContextMenu={(e) => e.preventDefault()}
        >
          {imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={nome ? `Figurinha de ${nome}` : "Figurinha personalizada"}
                className="w-full aspect-[2/3] object-cover"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                style={{ pointerEvents: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
              />
              <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="rotate-[-30deg] absolute w-[200%]" style={{ top: `${i * 22 - 10}%`, left: "-30%" }}>
                    <p className="text-white text-xl font-black tracking-[0.3em] whitespace-nowrap"
                      style={{ fontFamily: "var(--font-titulo)", textShadow: "1px 1px 4px rgba(0,0,0,0.4)", opacity: 0.35 }}>
                      PREVIEW &nbsp; PREVIEW &nbsp; PREVIEW
                    </p>
                    <p className="text-white text-[9px] font-bold tracking-widest whitespace-nowrap mt-1"
                      style={{ fontFamily: "var(--font-papernotes)", textShadow: "1px 1px 3px rgba(0,0,0,0.3)", opacity: 0.35 }}>
                      minha-figurinha-copa2026 &nbsp;&nbsp; minha-figurinha-copa2026 &nbsp;&nbsp; minha-figurinha-copa2026
                    </p>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0" />
            </>
          ) : (
            <div
              className="w-full aspect-[2/3] animate-pulse"
              style={{ background: "rgba(0,35,149,0.12)" }}
            />
          )}
        </div>

        {/* GOOLL! */}
        <h1
          className="text-6xl md:text-8xl text-copa-blue text-center tracking-[0.1em] mb-1"
          style={{ fontFamily: "var(--font-titulo)", fontWeight: 400 }}
        >
          GOOLL!
        </h1>

        <p className="text-lg md:text-xl text-copa-blue text-center font-bold mb-2" style={{ fontFamily: "var(--font-papernotes)" }}>
          Sua figurinha está pronta!
        </p>

        <p className="text-base text-gray-600 text-center mb-4" style={{ fontFamily: "var(--font-papernotes)" }}>
          Adquira sua figurinha HOJE e concorra a 1000 reais<br />Sorteio será realizado dia 11/06/2026
        </p>

        {/* Preço com desconto */}
        <p className="text-lg text-gray-400 line-through text-center" style={{ fontFamily: "'Montserrat', Arial Black, sans-serif", fontWeight: 900 }}>
          R$12,90
        </p>
        <p
          className="text-5xl md:text-6xl text-copa-green text-center mb-6 relative inline-block shine-effect"
          style={{ fontFamily: "'Montserrat', Arial Black, sans-serif", fontWeight: 900 }}
        >
          R$7,90
        </p>

        <button
          onClick={handleCheckout}
          className="w-full text-white font-bold text-xl md:text-2xl py-5 rounded-2xl
            active:scale-95 transition-all duration-200 cursor-pointer tracking-[0.15em] relative overflow-hidden"
          style={{
            fontFamily: "var(--font-titulo)",
            background: "linear-gradient(135deg, #002395 0%, #0040CC 50%, #002395 100%)",
            boxShadow: "0 6px 24px rgba(0,35,149,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            ⚽ RECEBER MINHA FIGURINHA
          </span>
        </button>

        <p className="text-sm text-gray-600 text-center mt-3" style={{ fontFamily: "var(--font-papernotes)" }}>
          ✅ Inclui download em alta qualidade
        </p>

        <div className="w-full mt-6">
          <p className="text-xs text-center mb-2 font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-papernotes)", color: "rgba(0,35,149,0.5)" }}>
            Últimas figurinhas geradas
          </p>
          <FigurinhasCarousel />
        </div>
      </div>
    </section>
  );
}
