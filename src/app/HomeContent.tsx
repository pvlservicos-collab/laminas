"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Hero from "@/components/Hero";
import QuizStep from "@/components/QuizStep";
import type { QuizData } from "@/components/QuizStep";
import LoadingScreen from "@/components/LoadingScreen";
import ResultScreen from "@/components/ResultScreen";
import ConfirmScreen from "@/components/ConfirmScreen";
import { track } from "@/lib/track";

function compressToBase64(file: File, maxSize = 512, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = URL.createObjectURL(file);
  });
}

const initialData: QuizData = {
  nome: "",
  dataNascimento: "",
  telefone: "",
  clube: "",
  jogadorFavorito: "",
  peso: "",
  altura: "",
  foto: null,
};

type AppStep = "hero" | "quiz-1" | "loading-photo" | "quiz-2" | "quiz-3" | "confirm" | "loading-generate" | "result";

const SEGUNDA_CHECKOUT = "https://checkout.figurinhadacopadomundo.com/VCCL1O8SD2GE";
const SEGUNDA_PRICE = "R$7,90";

export default function HomeContent({ checkoutUrl, price }: { checkoutUrl?: string; price?: string }) {
  const isSegunda = typeof window !== "undefined" && !!new URLSearchParams(window.location.search).get("start");
  const resolvedCheckoutUrl = checkoutUrl ?? (isSegunda ? SEGUNDA_CHECKOUT : undefined);
  const resolvedPrice = price ?? (isSegunda ? SEGUNDA_PRICE : undefined);

  const [appStep, setAppStep] = useState<AppStep>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("figurinha_sticker_url");
      if (saved) return "result";
      if (new URLSearchParams(window.location.search).get("start")) return "quiz-1";
    }
    return "hero";
  });
  const [quizStep, setQuizStep] = useState(1);
  const [data, setData] = useState<QuizData>(initialData);
  const [stickerUrl, setStickerUrl] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("figurinha_sticker_url") || "";
    return "";
  });
  const [stickerId, setStickerId] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("figurinha_sticker_id") || "";
    return "";
  });
  const [genStartTime, setGenStartTime] = useState(0);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const sessionRef = useRef<string>("");

  useEffect(() => {
    let sid = sessionStorage.getItem("_fsid");
    if (!sid) {
      sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem("_fsid", sid);
    }
    sessionRef.current = sid;
    if (new URLSearchParams(window.location.search).get("start")) {
      track("segunda_start");
    }
  }, []);

  useEffect(() => {
    const pendingTel = sessionStorage.getItem("_pending_tel");
    if (pendingTel) {
      sessionStorage.removeItem("_pending_tel");
      fetch("/api/abandono/figurinha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: pendingTel, _cancel: true }),
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ttclid", "sck"];
    for (const key of utmKeys) {
      const val = params.get(key);
      if (val) {
        try { localStorage.setItem(key, val); } catch { /* ignore */ }
      }
    }
  }, []);

  useEffect(() => {
    const stepMap: Partial<Record<AppStep, string>> = {
      "hero": "hero_view",
      "quiz-1": "quiz_1",
      "quiz-2": "quiz_2",
      "quiz-3": "quiz_3",
      "confirm": "confirm",
      "loading-generate": "loading",
      "result": stickerUrl ? "result_view" : "result_error",
    };
    const s = stepMap[appStep];
    if (!s) return;
    const { telefone, nome } = dataRef.current;
    const oferta = isSegunda ? "segunda" : (price === "R$9,90" ? "b" : "a");
    track(s, { email: telefone || undefined, nome: nome || undefined, oferta });
  }, [appStep, stickerUrl, isSegunda, price]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (appStep !== "loading-generate") return;
      e.preventDefault();
      const { telefone, nome } = dataRef.current;
      track("saiu_gerando", { email: telefone || undefined, nome: nome || undefined });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [appStep]);

  useEffect(() => {
    if (appStep !== "loading-generate") return;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let beaconSent = false;

    const sendBeaconNow = () => {
      if (beaconSent) return;
      beaconSent = true;
      const { telefone } = dataRef.current;
      if (!telefone) return;
      navigator.sendBeacon(
        "/api/abandono/figurinha",
        new Blob([JSON.stringify({ telefone })], { type: "application/json" })
      );
    };

    const sendAfterDelay = () => {
      if (beaconSent) return;
      beaconSent = true;
      const { telefone } = dataRef.current;
      if (!telefone) return;
      fetch("/api/abandono/figurinha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone }),
      }).catch(() => {});
    };

    const onVisibility = () => {
      if (document.hidden) {
        hideTimer = setTimeout(sendAfterDelay, 90_000);
      } else {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        if (beaconSent) {
          beaconSent = false;
          const { telefone } = dataRef.current;
          if (telefone) {
            fetch("/api/abandono/figurinha", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ telefone, _cancel: true }),
            }).catch(() => {});
          }
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", sendBeaconNow);

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", sendBeaconNow);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appStep]);

  useEffect(() => {
    if (appStep !== "result") return;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let sent = false;

    const sendAbandono = (useBeacon: boolean) => {
      if (sent) return;
      sent = true;
      const { telefone } = dataRef.current;
      const sid = stickerId || sessionStorage.getItem("figurinha_sticker_id") || "";
      if (!telefone) return;
      const payload = JSON.stringify({ telefone, stickerId: sid });
      if (useBeacon) {
        navigator.sendBeacon("/api/abandono/figurinha", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/abandono/figurinha", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload }).catch(() => {});
      }
    };

    const cancelAbandono = () => {
      if (!sent) return;
      sent = false;
      const { telefone } = dataRef.current;
      if (!telefone) return;
      fetch("/api/abandono/figurinha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefone, _cancel: true }) }).catch(() => {});
    };

    const onVisibility = () => {
      if (document.hidden) {
        hideTimer = setTimeout(() => sendAbandono(false), 120_000);
      } else {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        cancelAbandono();
      }
    };

    const onUnload = () => sendAbandono(true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appStep, stickerId]);

  useEffect(() => {
    if (appStep !== "loading-generate") return;
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch {
        // Wake Lock não suportado ou negado
      }
    };
    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      wakeLock?.release();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [appStep]);

  const updateData = (fields: Partial<QuizData>) => {
    setData((prev) => ({ ...prev, ...fields }));
    if (fields.foto) {
      const url = URL.createObjectURL(fields.foto);
      setFotoPreviewUrl(url);
    }
  };

  const [errorTimestamp, setErrorTimestamp] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const generateFigurinha = useCallback(async (retryAfterError?: string, attempt = 0) => {
    const current = dataRef.current;
    try {
      if (!current.foto) throw new Error("Sem foto");

      const fotoBase64 = await compressToBase64(current.foto, 512, 0.7);

      const res = await fetch("/api/figurinha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: current.nome,
          dataNascimento: current.dataNascimento,
          telefone: current.telefone,
          clube: current.clube,
          jogadorFavorito: current.jogadorFavorito,
          peso: current.peso || undefined,
          altura: current.altura || undefined,
          fotoBase64,
          errorTimestamp: retryAfterError || undefined,
          retryAttempt: attempt,
        }),
      });

      const result = await res.json();

      if (res.ok && result.imageBase64) {
        const dataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
        setStickerUrl(dataUrl);
        setStickerId(result.stickerId || "");
        setErrorTimestamp(null);
        sessionStorage.setItem("figurinha_sticker_url", dataUrl);
        sessionStorage.setItem("figurinha_sticker_id", result.stickerId || "");
        try { sessionStorage.removeItem("_pending_tel"); } catch { /* ignore */ }
        try { localStorage.setItem("figurinha_sticker_id", result.stickerId || ""); } catch { /* ignore */ }
        setAppStep("result");
        return;
      }

      console.warn(`Tentativa ${attempt + 1} falhou (server): ${result.error}`);
    } catch (error) {
      console.warn(`Tentativa ${attempt + 1} falhou (rede):`, error);
    }

    const now = new Date().toISOString();
    setErrorTimestamp(now);
    setRetryCount(attempt + 1);
    await new Promise(r => setTimeout(r, 2000));
    generateFigurinha(now, attempt + 1);
  }, []);

  const handleQuizNext = useCallback(() => {
    if (quizStep === 1) {
      setAppStep("loading-photo");
      setTimeout(() => {
        setQuizStep(2);
        setAppStep("quiz-2");
      }, 3000);
    } else if (quizStep === 2) {
      setQuizStep(3);
      setAppStep("quiz-3");
    } else if (quizStep === 3) {
      setAppStep("confirm");
    }
  }, [quizStep, generateFigurinha]);

  const handleQuizBack = useCallback(() => {
    if (quizStep === 2) {
      setQuizStep(1);
      setAppStep("quiz-1");
    } else if (quizStep === 3) {
      setQuizStep(2);
      setAppStep("quiz-2");
    }
  }, [quizStep]);

  return (
    <main className="flex flex-col items-center min-h-screen bg-[#006847]">
      {appStep === "hero" && (
        <Hero
          onStart={() => {
            sessionStorage.removeItem("figurinha_sticker_url");
            sessionStorage.removeItem("figurinha_sticker_id");
            setQuizStep(1);
            setAppStep("quiz-1");
          }}
        />
      )}

      {(appStep === "quiz-1" || appStep === "quiz-2" || appStep === "quiz-3") && (
        <QuizStep
          step={quizStep}
          data={data}
          updateData={updateData}
          onNext={handleQuizNext}
          onBack={handleQuizBack}
          totalSteps={3}
        />
      )}

      {appStep === "loading-photo" && (
        <LoadingScreen
          title="CARGANDO FOTO"
          gifUrl="https://media4.giphy.com/media/WxDZ77xhPXf3i/giphy.gif"
        />
      )}

      {appStep === "confirm" && (
        <ConfirmScreen
          data={data}
          fotoPreviewUrl={fotoPreviewUrl}
          onConfirm={() => {
            try { sessionStorage.setItem("_pending_tel", data.telefone.replace(/\D/g, "").slice(0, 20)); } catch { /* ignore */ }
            setGenStartTime(Date.now());
            setAppStep("loading-generate");
            generateFigurinha();
          }}
          onBack={() => {
            setQuizStep(3);
            setAppStep("quiz-3");
          }}
        />
      )}

      {appStep === "loading-generate" && (
        <LoadingScreen
          title="GENERANDO TU CROMO"
          gifUrl="/sorteio.webp"
          longWait
          startTime={genStartTime}
        />
      )}

      {appStep === "result" && (
        <ResultScreen
          stickerUrl={stickerUrl}
          stickerId={stickerId}
          checkoutUrl={resolvedCheckoutUrl}
          price={resolvedPrice}
          onRetry={() => {
            if (stickerId === "demo") {
              setStickerUrl("");
              setStickerId("");
              setQuizStep(1);
              setAppStep("quiz-1");
              return;
            }
            sessionStorage.removeItem("figurinha_sticker_url");
            sessionStorage.removeItem("figurinha_sticker_id");
            setGenStartTime(Date.now());
            setAppStep("loading-generate");
            generateFigurinha(errorTimestamp || undefined, retryCount);
          }}
        />
      )}
    </main>
  );
}
