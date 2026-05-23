"use client";

import { useState, useRef, useEffect } from "react";

export interface QuizData {
  nome: string;
  dataNascimento: string;
  telefone: string;
  clube: string;
  jogadorFavorito: string;
  peso: string;
  altura: string;
  foto: File | null;
}

function formatPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0052")) digits = digits.slice(4);
  else if (digits.startsWith("52") && digits.length > 10) digits = digits.slice(2);
  digits = digits.slice(0, 10);
  const n = digits.length;
  if (n === 0) return "";
  if (n <= 2) return `(${digits}`;
  if (n <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}

interface QuizStepProps {
  step: number;
  data: QuizData;
  updateData: (fields: Partial<QuizData>) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

const clubes = [
  // Liga MX principales
  "Club América", "Chivas de Guadalajara", "Cruz Azul", "Pumas UNAM",
  "Tigres UANL", "Monterrey", "Santos Laguna", "Atlas",
  "Toluca", "León", "Necaxa", "Puebla",
  "Querétaro", "FC Juárez", "Mazatlán", "Tijuana",
  "San Luis", "Pachuca", "Atlético de San Luis", "Lobos BUAP",
  // Ascenso / Liga de Expansión
  "Dorados de Sinaloa", "Mineros de Zacatecas", "Cimarrones de Sonora",
  "Tapatío", "Atlante", "Correcaminos", "Cancún FC",
  "Venados", "Tepatitlán", "Alebrijes de Oaxaca",
  // Selección
  "Selección Mexicana",
  // Internacional
  "Real Madrid", "Barcelona", "Manchester City", "PSG",
  "Bayern Munich", "Juventus", "Liverpool", "Chelsea",
];

export default function QuizStep({ step, data, updateData, onNext, onBack, totalSteps }: QuizStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [clubeQuery, setClubeQuery] = useState(data.clube || "");
  const [showClubeList, setShowClubeList] = useState(false);
  const clubeRef = useRef<HTMLDivElement>(null);

  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const filteredClubes = clubeQuery.trim()
    ? clubes.filter((c) => c.toLowerCase().includes(clubeQuery.toLowerCase()))
    : clubes;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clubeRef.current && !clubeRef.current.contains(e.target as Node)) setShowClubeList(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sanitize = (value: string) => value.replace(/<[^>]*>/g, "").replace(/[<>"'&]/g, "");

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    switch (step) {
      case 1:
        if (!data.nome || data.nome.trim().length < 2) newErrors.nome = "El nombre debe tener al menos 2 caracteres";
        if (data.nome.length > 50) newErrors.nome = "Nombre muy largo";
        if (!data.foto) newErrors.foto = "Por favor sube la foto del crack";
        break;
      case 2:
        if (!data.dataNascimento) newErrors.dataNascimento = "Por favor indica la fecha de nacimiento";
        else {
          const birth = new Date(data.dataNascimento);
          const now = new Date();
          const age = now.getFullYear() - birth.getFullYear();
          if (age < 0 || age > 120) newErrors.dataNascimento = "Fecha inválida";
        }
        { const digits = data.telefone.replace(/\D/g, "");
          if (digits.length < 10) newErrors.telefone = "Ingresa un teléfono válido con clave de área"; }
        break;
      case 3:
        if (!data.clube || data.clube.trim().length < 2) newErrors.clube = "Escribe o selecciona un equipo";
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) onNext();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErrors({ foto: "Por favor sube solo imágenes" }); return; }
    if (file.size > 10 * 1024 * 1024) { setErrors({ foto: "Imagen muy grande (máx. 10 MB)" }); return; }
    updateData({ foto: file });
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setErrors((prev) => { const next = { ...prev }; delete next.foto; return next; });
  };

  const progressPercent = (step / totalSteps) * 100;

  return (
    <section className="flex flex-col items-center min-h-[100dvh] w-full px-4 py-8 md:py-16" style={{ background: "#006847" }}>
      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-papernotes)" }}>
            Paso {step} de {totalSteps}
          </span>
          <span className="text-sm text-white" style={{ fontFamily: "var(--font-papernotes)" }}>
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden shadow-inner" style={{ background: "rgba(255,255,255,0.25)" }}>
          <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%`, background: "#CE1126" }} />
        </div>
      </div>

      {/* Card container — fundo branco */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-8 animate-slide-up">

        {/* Step 1: Nome + Foto */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <span className="text-4xl mb-2 block">✍️</span>
              <h2 className="text-2xl md:text-3xl font-black" style={{ fontFamily: "var(--font-titulo)", color: "#006847" }}>
                ¿CUÁL ES EL NOMBRE DEL CRACK?
              </h2>
              <p className="text-base mt-1 opacity-70" style={{ fontFamily: "var(--font-papernotes)" }}>
                El nombre que aparecerá en el cromo
              </p>
            </div>
            <div>
              <input
                type="text"
                value={data.nome}
                onChange={(e) => updateData({ nome: sanitize(e.target.value) })}
                placeholder="Nombre y apellido"
                maxLength={50}
                autoComplete="name"
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none transition-colors placeholder:text-gray-400 bg-white"
                style={{ fontFamily: "var(--font-papernotes)", borderColor: "#e5e7eb" }}
                onFocus={e => e.target.style.borderColor = "#006847"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
              {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-lg font-bold mb-2" style={{ fontFamily: "var(--font-titulo)", color: "#006847" }}>
                FOTO DEL CRACK
              </label>
              {photoPreview ? (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 rounded-xl p-4 text-center cursor-pointer hover:opacity-90 transition-opacity" style={{ borderColor: "#006847" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Preview" className="w-28 h-28 rounded-full mx-auto object-cover border-4" style={{ borderColor: "#006847" }} />
                  <p className="text-xs mt-2 font-bold" style={{ fontFamily: "var(--font-papernotes)", color: "#006847" }}>Toca para cambiar la foto</p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer transition-colors hover:border-green-700 bg-white">
                    <span className="text-3xl block mb-1">🖼️</span>
                    <p className="text-sm font-bold" style={{ fontFamily: "var(--font-titulo)" }}>Galería</p>
                  </button>
                  <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer transition-colors hover:border-green-700 bg-white">
                    <span className="text-3xl block mb-1">📸</span>
                    <p className="text-sm font-bold" style={{ fontFamily: "var(--font-titulo)" }}>Cámara</p>
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
              {errors.foto && <p className="text-red-500 text-sm mt-1">{errors.foto}</p>}
            </div>
          </div>
        )}

        {/* Step 2: Fecha + Teléfono */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <span className="text-4xl mb-2 block">🎂</span>
              <h2 className="text-2xl md:text-3xl font-black" style={{ fontFamily: "var(--font-titulo)", color: "#006847" }}>
                FECHA DE NACIMIENTO
              </h2>
              <p className="text-base mt-1 opacity-70" style={{ fontFamily: "var(--font-papernotes)" }}>
                Para calcular la edad en el cromo
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-base font-bold mb-1" style={{ fontFamily: "Arial, sans-serif", color: "#006847" }}>DÍA</label>
                <select
                  value={birthDay}
                  onChange={(e) => {
                    setBirthDay(e.target.value);
                    if (e.target.value && birthMonth && birthYear) {
                      updateData({ dataNascimento: `${birthYear}-${birthMonth}-${e.target.value}` });
                    }
                  }}
                  className="w-full px-3 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none transition-colors bg-white cursor-pointer"
                  style={{ fontFamily: "var(--font-papernotes)" }}
                >
                  <option value="">--</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{i + 1}</option>
                  ))}
                </select>
              </div>
              <div className="flex-[1.3]">
                <label className="block text-base font-bold mb-1" style={{ fontFamily: "Arial, sans-serif", color: "#006847" }}>MES</label>
                <select
                  value={birthMonth}
                  onChange={(e) => {
                    setBirthMonth(e.target.value);
                    if (birthDay && e.target.value && birthYear) {
                      updateData({ dataNascimento: `${birthYear}-${e.target.value}-${birthDay}` });
                    }
                  }}
                  className="w-full px-3 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none transition-colors bg-white cursor-pointer"
                  style={{ fontFamily: "var(--font-papernotes)" }}
                >
                  <option value="">--</option>
                  {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map((m, i) => (
                    <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-base font-bold mb-1" style={{ fontFamily: "Arial, sans-serif", color: "#006847" }}>AÑO</label>
                <select
                  value={birthYear}
                  onChange={(e) => {
                    setBirthYear(e.target.value);
                    if (birthDay && birthMonth && e.target.value) {
                      updateData({ dataNascimento: `${e.target.value}-${birthMonth}-${birthDay}` });
                    }
                  }}
                  className="w-full px-3 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none transition-colors bg-white cursor-pointer"
                  style={{ fontFamily: "var(--font-papernotes)" }}
                >
                  <option value="">--</option>
                  {Array.from({ length: new Date().getFullYear() - 1920 + 1 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            {errors.dataNascimento && <p className="text-red-500 text-sm mt-1">{errors.dataNascimento}</p>}

            {/* Teléfono */}
            <div>
              <label className="block text-lg font-bold mb-1" style={{ fontFamily: "var(--font-titulo)", color: "#006847" }}>
                TU WHATSAPP
              </label>
              <input
                type="tel"
                value={data.telefone}
                onChange={(e) => updateData({ telefone: formatPhone(e.target.value) })}
                placeholder="(55) 1234-5678"
                maxLength={16}
                autoComplete="tel"
                inputMode="numeric"
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none transition-colors placeholder:text-gray-400 bg-white"
                style={{ fontFamily: "var(--font-papernotes)" }}
              />
              {errors.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>}
            </div>
          </div>
        )}

        {/* Step 3: Equipo + Datos */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <span className="text-4xl mb-2 block">⭐</span>
              <h2 className="text-2xl md:text-3xl font-black" style={{ fontFamily: "var(--font-titulo)", color: "#006847" }}>
                EQUIPO Y DATOS
              </h2>
              <p className="text-base mt-1 opacity-70" style={{ fontFamily: "var(--font-papernotes)" }}>
                El equipo del corazón y los datos para el cromo
              </p>
            </div>

            {/* Peso y Altura */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-lg font-bold mb-1" style={{ fontFamily: "var(--font-titulo)", color: "#006847" }}>
                  PESO (kg)
                </label>
                <input
                  type="number"
                  value={data.peso}
                  onChange={(e) => updateData({ peso: e.target.value })}
                  placeholder="Ej: 70"
                  min={1} max={300}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none transition-colors placeholder:text-gray-400 bg-white"
                  style={{ fontFamily: "var(--font-papernotes)" }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-lg font-bold mb-1" style={{ fontFamily: "var(--font-titulo)", color: "#006847" }}>
                  ALTURA (cm)
                </label>
                <input
                  type="number"
                  value={data.altura}
                  onChange={(e) => updateData({ altura: e.target.value })}
                  placeholder="Ej: 175"
                  min={1} max={300}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none transition-colors placeholder:text-gray-400 bg-white"
                  style={{ fontFamily: "var(--font-papernotes)" }}
                />
              </div>
            </div>

            {/* Equipo */}
            <div ref={clubeRef} className="relative">
              <label className="block text-lg font-bold mb-1" style={{ fontFamily: "var(--font-titulo)", color: "#006847" }}>
                EQUIPO DEL CORAZÓN
              </label>
              <input
                type="text"
                value={clubeQuery}
                onChange={(e) => { const v = sanitize(e.target.value); setClubeQuery(v); updateData({ clube: v }); setShowClubeList(true); }}
                onFocus={() => setShowClubeList(true)}
                placeholder="Escribe el nombre del equipo..."
                maxLength={50}
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none transition-colors placeholder:text-gray-400 bg-white"
                style={{ fontFamily: "var(--font-papernotes)" }}
              />
              {showClubeList && (
                <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {filteredClubes.length > 0 ? filteredClubes.slice(0, 8).map((c) => (
                    <button key={c} type="button"
                      onClick={() => { setClubeQuery(c); updateData({ clube: c }); setShowClubeList(false); }}
                      className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${data.clube === c ? "font-bold" : "text-gray-700"} first:rounded-t-xl last:rounded-b-xl`}
                      style={{
                        fontFamily: "var(--font-papernotes)",
                        background: data.clube === c ? "rgba(0,104,71,0.1)" : undefined,
                        color: data.clube === c ? "#006847" : undefined,
                      }}
                      onMouseEnter={e => (e.target as HTMLButtonElement).style.background = "rgba(0,104,71,0.07)"}
                      onMouseLeave={e => (e.target as HTMLButtonElement).style.background = data.clube === c ? "rgba(0,104,71,0.1)" : ""}
                    >{c}</button>
                  )) : (
                    <div className="px-4 py-3 text-center" style={{ fontFamily: "var(--font-papernotes)" }}>
                      <p className="font-bold" style={{ color: "#006847" }}>Equipo personalizado</p>
                      <p className="text-sm text-gray-500">Usaremos &ldquo;{clubeQuery}&rdquo;</p>
                    </div>
                  )}
                </div>
              )}
              {errors.clube && <p className="text-red-500 text-sm mt-1">{errors.clube}</p>}
            </div>
          </div>
        )}

        {/* Privacy notice */}
        {step === 1 && (
          <p className="text-center text-xs text-gray-400 mt-6" style={{ fontFamily: "var(--font-papernotes)" }}>
            Al enviar aceptas nuestra{" "}
            <a href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 transition-colors">
              política de privacidad
            </a>
          </p>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-4">
          {step > 1 && (
            <button onClick={onBack}
              className="flex-1 px-6 py-4 rounded-xl border-2 font-bold hover:text-white transition-all duration-200 cursor-pointer tracking-[0.15em]"
              style={{ fontFamily: "var(--font-titulo)", borderColor: "#006847", color: "#006847" }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "#006847"; (e.target as HTMLButtonElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = ""; (e.target as HTMLButtonElement).style.color = "#006847"; }}
            >REGRESAR</button>
          )}
          <button onClick={handleNext}
            className="flex-1 text-white font-bold text-lg px-6 py-4 rounded-xl shadow-lg active:scale-95 transition-all duration-200 cursor-pointer tracking-[0.15em]"
            style={{ fontFamily: "var(--font-titulo)", background: "#CE1126" }}
          >
            {step === totalSteps ? "CREAR CROMO ⚽" : "SIGUIENTE →"}
          </button>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 mt-6">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${i + 1 <= step ? "scale-110" : "opacity-50"}`}
            style={{ background: i + 1 <= step ? "#CE1126" : "#ffffff" }} />
        ))}
      </div>
    </section>
  );
}
