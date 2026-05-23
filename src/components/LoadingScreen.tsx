"use client";

import { useState, useEffect, useRef } from "react";

interface LoadingScreenProps {
  title: string;
  gifUrl: string;
  longWait?: boolean;
  startTime?: number;
}

const curiosidades = [
  "¿Sabías? ¡El Mundial 2026 será el primero con 48 selecciones! Será histórico.",
  "¿Sabías? México es el único país junto al Azteca que ha albergado dos finales mundialistas.",
  "¿Sabías? Hugo Sánchez anotó 234 goles en la Liga española. ¡El mejor mexicano de todos los tiempos!",
  "¿Sabías? El estadio Azteca tiene capacidad para más de 87,000 aficionados.",
  "¿Sabías? México ha clasificado al Mundial en 17 de las últimas 18 ediciones.",
  "¿Sabías? El 'Quinto Partido' de México en 1986 fue contra Alemania: 0-0, eliminación en penaltis.",
  "¿Sabías? Cuauhtémoc Blanco inventó la 'cuauhtemiña' o 'penal de bicicleta' en el Mundial 98.",
  "¿Sabías? El Mundial 2026 se jugará en México, EE. UU. y Canadá. ¡Tres países!",
  "¿Sabías? El récord de goles en un Mundial es de Just Fontaine: 13 goles en 1958.",
  "¿Sabías? Guillermo Ochoa ha sido figura en varios mundiales con grandes atajadas.",
  "¿Sabías? México debutó en el Mundial de 1930 en Uruguay.",
  "¿Sabías? El Tri ha llegado a cuartos de final dos veces: 1970 y 1986, ambas en México.",
  "¿Sabías? Javier 'Chicharito' Hernández es el máximo goleador histórico de la Selección Mexicana.",
  "¿Sabías? México enfrentará partidos de fase de grupos en el Azteca en el Mundial 2026.",
  "¿Sabías? El gol más rápido de la historia del Mundial se marcó en 10.8 segundos.",
  "¿Sabías? Miroslav Klose es el máximo goleador de la historia de los Mundiales con 16 goles.",
  "¿Sabías? La selección mexicana es conocida como 'El Tri' por los colores de su bandera.",
  "¿Sabías? Andrés Guardado tiene el récord de más partidos disputados con la Selección Mexicana.",
];

export default function LoadingScreen({ title, gifUrl, longWait, startTime }: LoadingScreenProps) {
  const [percent, setPercent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [curiosidadeIndex, setCuriosidadeIndex] = useState(0);
  const start = useRef(startTime || Date.now());

  useEffect(() => {
    start.current = startTime || Date.now();
    setPercent(0);
    setElapsed(0);
    setCuriosidadeIndex(Math.floor(Math.random() * curiosidades.length));
  }, [startTime]);

  useEffect(() => {
    if (!longWait) return;
    const interval = setInterval(() => {
      setCuriosidadeIndex((prev) => (prev + 1) % curiosidades.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [longWait]);

  useEffect(() => {
    if (!longWait) {
      const duration = 3000;
      const interval = setInterval(() => {
        const now = Date.now();
        const progress = Math.min(100, Math.round(((now - start.current) / duration) * 100));
        setPercent(progress);
        if (progress >= 100) clearInterval(interval);
      }, 50);
      return () => clearInterval(interval);
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - start.current;
      setElapsed(Math.floor(elapsedMs / 1000));

      let newPercent: number;
      if (elapsedMs < 60000) {
        newPercent = Math.round((elapsedMs / 60000) * 80);
      } else if (elapsedMs < 180000) {
        const extra = ((elapsedMs - 60000) / 120000) * 18;
        newPercent = Math.round(80 + extra);
      } else {
        newPercent = 99;
      }

      setPercent((prev) => Math.max(prev, newPercent));
    }, 200);

    return () => clearInterval(interval);
  }, [longWait]);

  return (
    <section className="flex flex-col items-center justify-center min-h-[100dvh] w-full px-4" style={{ background: "#006847" }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-6 animate-slide-up">
        <h2
          className="text-3xl md:text-4xl font-bold tracking-[0.1em] text-center"
          style={{ fontFamily: "var(--font-titulo)", color: "#006847" }}
        >
          {title}
        </h2>

        {longWait && (
          <p className="text-sm font-bold text-center -mt-4" style={{ fontFamily: "var(--font-papernotes)", color: "#006847" }}>
            No salgas de esta pantalla, puede tardar hasta 2 minutos.
          </p>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gifUrl}
          alt="Cargando..."
          className={longWait ? "w-[65%] rounded-2xl object-cover" : "w-48 h-48 rounded-2xl object-cover"}
        />

        {longWait && (
          <div className="text-center leading-snug">
            <p className="text-base font-bold" style={{ fontFamily: "var(--font-papernotes)", color: "#006847" }}>
              ¡Obtén tu cromo HOY y participa por
            </p>
            <p className="text-4xl font-black my-1" style={{ fontFamily: "var(--font-titulo)", color: "#CE1126" }}>
              MIL DÓLARES
            </p>
            <p className="text-base font-bold" style={{ fontFamily: "var(--font-papernotes)", color: "#006847" }}>
              el día 11/06/2026, inicio de los juegos.
            </p>
          </div>
        )}

        <p
          className="text-base text-center min-h-[3rem] transition-opacity duration-500"
          style={{ fontFamily: "var(--font-papernotes)" }}
        >
          {longWait ? (
            <span className="font-bold" style={{ color: "#006847" }}>{curiosidades[curiosidadeIndex]}</span>
          ) : (
            <span style={{ color: "#006847" }}>¡Este tiene cara de jugador caro, eh!</span>
          )}
        </p>

        <div className="w-full">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold" style={{ fontFamily: "var(--font-papernotes)", color: "#006847" }}>
              {longWait && elapsed > 0 ? `${elapsed}s` : "Cargando..."}
            </span>
            <span className="text-sm font-bold" style={{ fontFamily: "var(--font-papernotes)", color: "#006847" }}>
              {percent}%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percent}%`, background: "#CE1126" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
