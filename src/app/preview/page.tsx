"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PreviewContent() {
  const params = useSearchParams();
  const stickerUrl = params.get("img");
  const nome = params.get("nome") || "Craque";
  const stickerId = params.get("id") || "";

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center animate-slide-up">
        {stickerUrl && (
          <div
            className="relative w-52 md:w-64 rounded-xl overflow-hidden shadow-2xl border-3 border-copa-blue mb-6"
            onContextMenu={(e) => e.preventDefault()}
            style={{ userSelect: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stickerUrl}
              alt={`Figurinha de ${nome}`}
              className="w-full aspect-[2/3] object-cover"
              draggable={false}
              style={{ pointerEvents: "none" }}
            />
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="rotate-[-30deg] absolute w-[200%]" style={{ top: `${i * 22 - 10}%`, left: "-30%" }}>
                  <p className="text-white text-xl font-black tracking-[0.3em] whitespace-nowrap"
                    style={{ fontFamily: "var(--font-titulo)", textShadow: "1px 1px 4px rgba(0,0,0,0.6)", opacity: 0.5 }}>
                    PREVIEW &nbsp; PREVIEW &nbsp; PREVIEW
                  </p>
                  <p className="text-white text-[9px] font-bold tracking-widest whitespace-nowrap mt-1"
                    style={{ fontFamily: "var(--font-papernotes)", textShadow: "1px 1px 3px rgba(0,0,0,0.5)", opacity: 0.4 }}>
                    minha-figurinha-copa2026 &nbsp;&nbsp; minha-figurinha-copa2026 &nbsp;&nbsp; minha-figurinha-copa2026
                  </p>
                </div>
              ))}
            </div>
            <div className="absolute inset-0" />
          </div>
        )}

        <h1
          className="text-4xl md:text-5xl font-bold text-copa-blue text-center tracking-[0.1em] mb-2"
          style={{ fontFamily: "var(--font-titulo)" }}
        >
          ÚLTIMA CHANCE!
        </h1>

        <p
          className="text-lg text-center leading-relaxed mb-2"
          style={{ fontFamily: "var(--font-papernotes)" }}
        >
          A figurinha de <strong className="text-copa-blue">{nome}</strong> está
          prestes a ser excluída!
        </p>

        <p
          className="text-base text-gray-600 text-center mb-4"
          style={{ fontFamily: "var(--font-papernotes)" }}
        >
          Profitez de l&apos;offre spéciale et recevez le fichier numérique prêt pour l&apos;impression.
        </p>

        <p
          className="text-lg text-gray-400 line-through text-center"
          style={{ fontFamily: "'Montserrat', Arial Black, sans-serif", fontWeight: 900 }}
        >
          €3,99
        </p>

        <p
          className="text-5xl md:text-6xl text-copa-green text-center mb-6 shine-effect"
          style={{ fontFamily: "'Montserrat', Arial Black, sans-serif", fontWeight: 900 }}
        >
          R$12,90
        </p>

        <button
          onClick={() => {
            const checkoutUrl = process.env.NEXT_PUBLIC_CHECKOUT_URL || "https://pay.onprofit.com.br/5Sh0FbF4?off=3wCdRS";
            const p = new URLSearchParams(window.location.search);
            const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ttclid", "sck"];
            const utms: string[] = [];
            for (const key of utmKeys) {
              const val = p.get(key) || (() => { try { return localStorage.getItem(key) || ""; } catch { return ""; } })();
              if (val) utms.push(`${key}=${encodeURIComponent(val)}`);
            }
            const sep = checkoutUrl.includes("?") ? "&" : "?";
            const utmStr = utms.length > 0 ? `&${utms.join("&")}` : "";
            window.location.href = `${checkoutUrl}${sep}src=${stickerId}${utmStr}`;
          }}
          className="w-full bg-copa-green text-copa-white font-bold text-xl py-5 rounded-2xl
            shadow-lg hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer tracking-[0.1em] text-center block"
          style={{ fontFamily: "var(--font-titulo)" }}
        >
          QUERO MINHA FIGURINHA
        </button>
      </div>
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <main className="flex items-center justify-center min-h-screen bg-white">
        <p style={{ fontFamily: "var(--font-papernotes)" }}>Carregando...</p>
      </main>
    }>
      <PreviewContent />
    </Suspense>
  );
}
