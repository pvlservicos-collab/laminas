"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Chart as ChartType } from "chart.js";

// ==============================
// TYPES
// ==============================

type Tab = "figurinhas" | "metricas" | "apis" | "leads" | "orderbumps";
type AdminUser = string;
type DateFilter = "all" | "today" | "yesterday";
type Period =
  | "today" | "7d" | "30d" | "all"
  | "1h" | "2h" | "3h" | "4h" | "5h" | "6h"
  | "7h" | "8h" | "9h" | "10h" | "11h" | "12h";

interface Figurinha {
  id: number;
  nome: string | null;
  clube: string | null;
  telefone: string | null;
  sticker_url: string;
  preview_url: string | null;
  sticker_id: string;
  status: string;
  created_at: string;
  price_paid: number | null;
}

interface Lead {
  session_id: string;
  email: string;
  nome: string | null;
  step: string;
  updated_at: string;
  cta_clicked: boolean;
  obrigado: boolean;
  price_paid: number | null;
}

interface ApiKeyStats {
  api_key_used: number;
  total: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
}

interface ApiGenRecente {
  nome: string | null;
  email: string;
  api_key_used: number;
  generation_ms: number;
  created_at: string;
}

interface ApiStats {
  perKey: ApiKeyStats[];
  recentes: ApiGenRecente[];
}

interface FunilData {
  // Session-based (100% reliable)
  sessions: {
    total: number; cta: number; obrigados: number;
    daily: { day: string; count: number; count_a: number; count_b: number }[];
    a: { total: number; viu_preco: number; cta: number; obrigados: number };
    b: { total: number; viu_preco: number; cta: number; obrigados: number };
  };
  funnel: { step: string; count: number; count_a: number; count_b: number }[];
  // Sales (webhook-based)
  vendas: {
    pagos: number;
    a_count: number; a_total: number;
    b_count: number; b_total: number;
    bumps_count: number; bumps_receita: number;
    daily: { day: string; count: number }[];
  };
  segunda: { cliques: number; starts: number; compras: number; receita: number | null; viu_preco: number; cta: number; obrigados: number };
  // Lists
  leads: Lead[];
  obrigados: { session_id: string; email: string; nome: string | null; updated_at: string; telefone: string | null }[];
  // Legacy compat
  pagos: number;
  obrigadosCount: number;
  // Diagnostic
  _diag?: { total_rows: number; main_rows: number; bump_rows: number; null_type_rows: number; min_price: number | null; max_price: number | null; zero_price_rows: number };
}

// ==============================
// CONSTANTS
// ==============================

const STEP_LABEL: Record<string, string> = {
  hero_view:    "Chegou na página",
  quiz_1:       "Card 2 — Nome/foto",
  quiz_2:       "Card 3 — Clube",
  quiz_3:       "Card 4 — Email",
  confirm:      "Confira seus dados",
  loading:      "Gerou figurinha",
  saiu_gerando: "Saiu durante geração",
  result_view:  "Viu preview c/ preço",
  result_ok:    "Viu preview c/ preço",
  result_error: "Erro na geração",
  checkout:     "Clicou em comprar",
  obrigado:     "Comprou ✓",
};

const FUNNEL_STEPS = [
  { key: "hero_view",    label: "Chegou na página",     color: "#64748b" },
  { key: "quiz_1",       label: "Nome/foto",            color: "#006847" },
  { key: "quiz_2",       label: "Clube",                color: "#006847" },
  { key: "quiz_3",       label: "Confirmou dados",      color: "#006847" },
  { key: "loading",      label: "Gerou figurinha",      color: "#eab308" },
  { key: "saiu_gerando", label: "Saiu na geração",      color: "#f97316" },
  { key: "result_view",  label: "Viu o preço",          color: "#006847" },
  { key: "result_error", label: "Erro na geração",      color: "#ef4444" },
  { key: "checkout",     label: "Clicou em comprar",    color: "#a855f7" },
  { key: "obrigado",     label: "Chegou no obrigado",   color: "#006847" },
];

const EMPTY_FUNIL: FunilData = {
  sessions: { total: 0, cta: 0, obrigados: 0, daily: [], a: { total: 0, viu_preco: 0, cta: 0, obrigados: 0 }, b: { total: 0, viu_preco: 0, cta: 0, obrigados: 0 } },
  funnel: [],
  vendas: { pagos: 0, a_count: 0, a_total: 0, b_count: 0, b_total: 0, bumps_count: 0, bumps_receita: 0, daily: [] },
  segunda: { cliques: 0, starts: 0, compras: 0, receita: null, viu_preco: 0, cta: 0, obrigados: 0 },
  leads: [], obrigados: [],
  pagos: 0, obrigadosCount: 0,
};


// ==============================
// HELPERS
// ==============================

function StatusBadge({ status }: { status: string | null }) {
  const MAP: Record<string, [string, string, string]> = {
    pendente:    ["#f1f5f9", "#475569", "Pendente"],
    pago:        ["#dbeafe", "#CE1126", "Pago"],
    entregue:    ["#d4edda", "#004f35", "Entregue"],
    recuperado:  ["#ede9fe", "#5b21b6", "Recuperado"],
    recuperacao: ["#ffedd5", "#c2410c", "Em Recuperação"],
  };
  const [bg, color, label] = MAP[status || ""] ?? ["#f1f5f9", "#94a3b8", "Sem pedido"];
  return (
    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: bg, color, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

// ==============================
// LOGIN SCREEN
// ==============================

function LoginScreen({ onLogin }: { onLogin: (u: AdminUser) => void }) {
  const [value, setValue]     = useState("");
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const name = value.trim();
    if (!name) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (json.ok) {
        onLogin(json.user);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #003828 0%, #004030 60%, #003828 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: "#002e20", borderRadius: 20, padding: "44px 40px",
        maxWidth: 380, width: "100%", boxShadow: "0 25px 50px rgba(0,0,0,.5)", textAlign: "center",
      }}>
        <div style={{
          width: 72, height: 72,
          background: "linear-gradient(135deg, #006847 0%, #CE1126 100%)",
          borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px", fontSize: 36,
        }}>
          ⚽
        </div>
        <h1 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-.02em" }}>
          Painel Figurinha
        </h1>
        <p style={{ color: "#475569", fontSize: 13, margin: "0 0 32px" }}>Copa do Mundo 2026</p>
        <input
          type="text"
          placeholder=""
          value={value}
          onChange={e => { setValue(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && !loading && handleSubmit()}
          autoFocus
          style={{
            width: "100%", boxSizing: "border-box",
            border: `1px solid ${error ? "#ef4444" : "#334155"}`,
            borderRadius: 10, padding: "14px 16px", fontSize: 15,
            background: "#004030", color: "#f1f5f9", outline: "none",
            marginBottom: 10, textAlign: "center", letterSpacing: ".04em",
          }}
        />
        {error && (
          <p style={{ color: "#ef4444", fontSize: 12, margin: "0 0 10px", fontWeight: 600 }}>
            Nome não reconhecido. Tente novamente.
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", background: "#CE1126", border: "none", borderRadius: 10,
            color: "#fff", fontSize: 15, fontWeight: 700, padding: "15px 20px",
            cursor: loading ? "default" : "pointer", letterSpacing: ".04em",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}

// ==============================
// SIDEBAR
// ==============================

const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  { tab: "figurinhas",  label: "Figurinhas",   icon: "⚽" },
  { tab: "metricas",    label: "Métricas",     icon: "📊" },
  { tab: "apis",        label: "Uso de APIs",  icon: "⚡" },
  { tab: "leads",       label: "Leads",        icon: "👥" },
  { tab: "orderbumps",  label: "Order Bumps",  icon: "🛒" },
];

function Sidebar({ tab, onTab, user, onLogout }: {
  tab: Tab; onTab: (t: Tab) => void; user: AdminUser; onLogout: () => void;
}) {
  return (
    <aside style={{
      width: 220, minWidth: 220, background: "#004030", display: "flex",
      flexDirection: "column", height: "100vh", position: "sticky", top: 0,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxShadow: "2px 0 8px rgba(0,0,0,.3)",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #002e20" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34,
            background: "linear-gradient(135deg, #006847, #CE1126)",
            borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>⚽</div>
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 13, letterSpacing: ".05em" }}>FIGURINHA</div>
            <div style={{ color: "#475569", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase" }}>Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.tab}
            onClick={() => onTab(item.tab)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "11px 12px", borderRadius: 8, border: "none",
              background: tab === item.tab ? "#CE1126" : "transparent",
              color: tab === item.tab ? "#fff" : "#64748b",
              cursor: "pointer", fontSize: 13,
              fontWeight: tab === item.tab ? 700 : 500,
              marginBottom: 2, textAlign: "left",
            }}
          >
            <span style={{ fontSize: 17 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: "14px 12px", borderTop: "1px solid #002e20" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", background: "#006847", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 15,
          }}>
            {user[0].toUpperCase()}
          </div>
          <div>
            <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>{user}</div>
            <div style={{ color: "#475569", fontSize: 10 }}>Administrador</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: "100%", background: "#002e20", color: "#64748b", border: "none",
            borderRadius: 6, padding: "9px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600,
          }}
        >
          ← Sair
        </button>
      </div>
    </aside>
  );
}

// ==============================
// FIGURINHAS TAB
// ==============================

function FigurinhasTab() {
  const [nomeSearch, setNomeSearch] = useState("");
  const [foneSearch, setFoneSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [pageLimit, setPageLimit] = useState(24);
  const [page, setPage] = useState(0);
  const [figurinhas, setFigurinhas] = useState<Figurinha[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchFigurinhas = useCallback(async (
    p: number, limit: number, nome: string, fone: string, date: DateFilter
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ all: "1", limit: String(limit), offset: String(p * limit) });
      if (nome.trim()) params.set("nome", nome.trim());
      if (fone.trim()) params.set("fone", fone.trim());
      if (date !== "all") params.set("date", date);
      const res = await fetch(`/api/admin/pedidos?${params}`);
      if (res.status === 401) { dispatchUnauthorized(); return; }
      const json = await res.json();
      setFigurinhas(json.pedidos || []);
      setTotal(json.totalFiltered || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFigurinhas(0, pageLimit, nomeSearch, foneSearch, dateFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setPage(0);
    fetchFigurinhas(0, pageLimit, nomeSearch, foneSearch, dateFilter);
  };

  const handleDateFilter = (d: DateFilter) => {
    setDateFilter(d);
    setPage(0);
    fetchFigurinhas(0, pageLimit, nomeSearch, foneSearch, d);
  };

  const handleLimitChange = (limit: number) => {
    setPageLimit(limit);
    setPage(0);
    fetchFigurinhas(0, limit, nomeSearch, foneSearch, dateFilter);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchFigurinhas(p, pageLimit, nomeSearch, foneSearch, dateFilter);
  };

  const copyUrl = (id: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const totalPages = Math.ceil(total / pageLimit) || 1;

  return (
    <div style={{ padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#004030", margin: "0 0 4px" }}>
          Figurinhas{" "}
          {total > 0 && <span style={{ color: "#64748b", fontWeight: 500, fontSize: 14 }}>({total} total)</span>}
        </h2>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Todas as figurinhas geradas, da mais recente</p>
      </div>

      {/* Search + Filters */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,.07)", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Nome da criança..."
            value={nomeSearch}
            onChange={e => setNomeSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            style={{ flex: "1 1 160px", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", color: "#334155" }}
          />
          <input
            type="text"
            placeholder="Número (telefone)..."
            value={foneSearch}
            onChange={e => setFoneSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            style={{ flex: "1 1 160px", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", color: "#334155" }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{ background: "#006847", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}
          >
            {loading ? "..." : "Buscar"}
          </button>
        </div>

        {/* Filters row */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Date filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {([["all", "Tudo"], ["today", "Hoje"], ["yesterday", "Ontem"]] as [DateFilter, string][]).map(([d, label]) => (
              <button
                key={d}
                onClick={() => handleDateFilter(d)}
                style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${dateFilter === d ? "#006847" : "#e2e8f0"}`,
                  background: dateFilter === d ? "#006847" : "#f8fafc",
                  color: dateFilter === d ? "#fff" : "#64748b",
                  cursor: "pointer",
                }}
              >{label}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />

          {/* Page size */}
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Mostrar:</span>
          <div style={{ display: "flex", gap: 4 }}>
            {[12, 24, 48, 100].map(n => (
              <button
                key={n}
                onClick={() => handleLimitChange(n)}
                style={{
                  padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${pageLimit === n ? "#004030" : "#e2e8f0"}`,
                  background: pageLimit === n ? "#004030" : "#f8fafc",
                  color: pageLimit === n ? "#fff" : "#64748b",
                  cursor: "pointer",
                }}
              >{n}</button>
            ))}
          </div>

          {loading && <span style={{ fontSize: 11, color: "#94a3b8" }}>Carregando...</span>}
        </div>
      </div>

      {/* Gallery */}
      {figurinhas.length === 0 && !loading ? (
        <div style={{ background: "#fff", borderRadius: 12, padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          Nenhuma figurinha encontrada.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: 14 }}>
          {figurinhas.map(f => (
            <div key={f.id} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.09)", display: "flex", flexDirection: "column" }}>
              {/* Image */}
              <div style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.preview_url || f.sticker_url}
                  alt={f.nome || "figurinha"}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <span style={{
                  position: "absolute", top: 5, right: 5,
                  background: f.status === "entregue" ? "#006847" : f.status === "pago" ? "#CE1126" : f.status === "recuperado" ? "#7c3aed" : "#64748b",
                  color: "#fff", fontSize: 8, fontWeight: 700, borderRadius: 4, padding: "2px 5px", textTransform: "uppercase",
                }}>{f.status}</span>
              </div>
              {/* Info */}
              <div style={{ padding: "8px 10px 4px", flex: 1 }}>
                <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#004030", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.nome || "—"}
                </p>
                {f.telefone ? (
                  <a
                    href={`https://wa.me/${f.telefone.replace(/\D/g, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: "#006847", textDecoration: "none", fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >{f.telefone}</a>
                ) : (
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>Sem número</span>
                )}
                <p style={{ margin: "3px 0 0", fontSize: 9, color: "#94a3b8" }}>
                  {new Date(f.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
                {f.price_paid != null && (
                  <p style={{ margin: "3px 0 0", fontSize: 10, fontWeight: 800, color: "#006847" }}>
                    R${(f.price_paid / 100).toFixed(2).replace(".", ",")}
                  </p>
                )}
              </div>
              {/* Actions */}
              <div style={{ padding: "6px 8px 9px", display: "flex", gap: 4 }}>
                <a
                  href={`/api/download?url=${encodeURIComponent(f.sticker_url)}&name=figurinha-${(f.nome || "sem-nome").toLowerCase().replace(/\s+/g, "-")}`}
                  style={{ flex: 1, background: "#006847", color: "#fff", borderRadius: 6, padding: "5px 4px", fontSize: 10, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "block" }}
                >⬇ Baixar</a>
                <button
                  onClick={() => copyUrl(f.id, f.sticker_url)}
                  style={{
                    flex: 1, background: copiedId === f.id ? "#006847" : "#6366f1",
                    color: "#fff", border: "none", borderRadius: 6,
                    padding: "5px 4px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                  }}
                >{copiedId === f.id ? "✓ OK" : "🔗 URL"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, background: "#fff", borderRadius: 10, padding: "12px 16px", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {page * pageLimit + 1}–{Math.min((page + 1) * pageLimit, total)} de {total}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => handlePageChange(0)} disabled={page === 0}
              style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: page === 0 ? "default" : "pointer", color: page === 0 ? "#cbd5e1" : "#334155", background: "#fff" }}>«</button>
            <button onClick={() => handlePageChange(Math.max(0, page - 1))} disabled={page === 0}
              style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: page === 0 ? "default" : "pointer", color: page === 0 ? "#cbd5e1" : "#334155", background: "#fff" }}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5));
              const p = start + i;
              return (
                <button key={p} onClick={() => handlePageChange(p)}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", background: p === page ? "#006847" : "#fff", color: p === page ? "#fff" : "#334155", fontWeight: p === page ? 700 : 400 }}>
                  {p + 1}
                </button>
              );
            })}
            <button onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1}
              style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: page === totalPages - 1 ? "default" : "pointer", color: page === totalPages - 1 ? "#cbd5e1" : "#334155", background: "#fff" }}>›</button>
            <button onClick={() => handlePageChange(totalPages - 1)} disabled={page === totalPages - 1}
              style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: page === totalPages - 1 ? "default" : "pointer", color: page === totalPages - 1 ? "#cbd5e1" : "#334155", background: "#fff" }}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================
// METRICAS TAB
// ==============================

// Classify a price value into offer type (works for both centavos and decimal reais)
function classifyPrice(price: number | null): "A" | "B" | "segunda" | null {
  if (!price || price <= 0) return null;
  if (price >= 1100 || (price >= 11 && price < 100)) return "A";
  if ((price >= 900 && price < 1100) || (price >= 9 && price < 11)) return "B";
  if ((price >= 700 && price < 900) || (price >= 7 && price < 9)) return "segunda";
  return null;
}

function MetricasTab() {
  const [data, setData]           = useState<FunilData>(EMPTY_FUNIL);
  const [period, setPeriod]       = useState<Period>("today");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [sub, setSub]             = useState<"comp" | "segunda">("comp");

  // Chart canvas refs
  const dailyRef   = useRef<HTMLCanvasElement>(null);
  const funnelRef  = useRef<HTMLCanvasElement>(null);
  const dailyInst  = useRef<ChartType | null>(null);
  const funnelInst = useRef<ChartType | null>(null);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/funil?period=${p}`);
      if (res.status === 401) { dispatchUnauthorized(); return; }
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchData(period); return 60; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [period, fetchData]);

  // Visão Geral charts (sessions daily A+B+histórico + funnel A+B+histórico)
  useEffect(() => {
    if (sub !== "comp" || !dailyRef.current || !funnelRef.current) return;
    import("chart.js/auto").then(({ default: Chart }) => {
      const last14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - 13 + i);
        return d.toISOString().slice(0, 10);
      });
      const dailyMap = new Map(data.sessions.daily.map(d => [String(d.day).slice(0, 10), d]));
      const dailyLabels = last14.map(d => { const [, m, dy] = d.split("-"); return `${dy}/${m}`; });

      dailyInst.current?.destroy();
      if (dailyRef.current) {
        dailyInst.current = new Chart(dailyRef.current, {
          type: "bar",
          data: {
            labels: dailyLabels,
            datasets: [
              { label: "Oferta A", data: last14.map(d => dailyMap.get(d)?.count_a || 0), backgroundColor: "#00684799", borderColor: "#006847", borderWidth: 1.5, borderRadius: 3 },
              { label: "Oferta B", data: last14.map(d => dailyMap.get(d)?.count_b || 0), backgroundColor: "#f59e0b99", borderColor: "#f59e0b", borderWidth: 1.5, borderRadius: 3 },
            ],
          },
          options: { responsive: true, plugins: { legend: { position: "top" as const, labels: { boxWidth: 12, font: { size: 11 } } } }, scales: { y: { beginAtZero: true, grid: { color: "#E2E8F0" } }, x: { grid: { display: false } } } },
        });
      }

      funnelInst.current?.destroy();
      if (funnelRef.current) {
        funnelInst.current = new Chart(funnelRef.current, {
          type: "bar",
          data: {
            labels: FUNNEL_STEPS.map(s => s.label),
            datasets: [
              { label: "Oferta A", data: FUNNEL_STEPS.map(s => data.funnel.find(f => f.step === s.key || (s.key === "result_view" && f.step === "result_ok"))?.count_a || 0), backgroundColor: "#00684766", borderColor: "#006847", borderWidth: 1.5, borderRadius: 3 },
              { label: "Oferta B", data: FUNNEL_STEPS.map(s => data.funnel.find(f => f.step === s.key || (s.key === "result_view" && f.step === "result_ok"))?.count_b || 0), backgroundColor: "#f59e0b66", borderColor: "#f59e0b", borderWidth: 1.5, borderRadius: 3 },
            ],
          },
          options: { responsive: true, indexAxis: "y" as const, plugins: { legend: { position: "top" as const, labels: { boxWidth: 12, font: { size: 11 } } } }, scales: { x: { beginAtZero: true, grid: { color: "#E2E8F0" } }, y: { grid: { display: false } } } },
        });
      }
    });
    return () => {
      dailyInst.current?.destroy();  dailyInst.current  = null;
      funnelInst.current?.destroy(); funnelInst.current = null;
    };
  }, [data, sub]);

  const PERIODS: { key: Period; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "7d",    label: "7 dias" },
    { key: "30d",   label: "30 dias" },
    { key: "all",   label: "Tudo" },
  ];
  const hourPeriods  = [1,2,3,4,5,6,7,8,9,10,11,12].map(h => ({ key: `${h}h` as Period, label: `${h}h` }));
  const selectedHour = hourPeriods.find(h => h.key === period)?.key ?? "";

  const SUB_TABS = [
    { key: "comp" as const,    label: "Visão Geral",  color: "#004030" },
    { key: "segunda" as const, label: "2ª Figurinha", color: "#7c3aed" },
  ];

  const cardStyle = { background: "#fff", borderRadius: 12, padding: "18px 16px", boxShadow: "0 1px 3px rgba(0,0,0,.07)" } as const;
  const chartBox  = { background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,.07)" } as const;

  const s = data.sessions;
  const taxaObg = s.total > 0 ? Math.round(s.obrigados / s.total * 100) : 0;

  return (
    <div style={{ padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#004030", margin: "0 0 4px" }}>Métricas</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
            {loading ? "Carregando..." : `Atualiza em ${countdown}s`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => { setPeriod(p.key); setCountdown(60); }}
              style={{ background: period === p.key ? "#006847" : "#fff", color: period === p.key ? "#fff" : "#64748b", border: `1px solid ${period === p.key ? "#006847" : "#e2e8f0"}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              {p.label}
            </button>
          ))}
          <select
            value={selectedHour}
            onChange={e => { if (e.target.value) { setPeriod(e.target.value as Period); setCountdown(60); } }}
            style={{ background: selectedHour ? "#006847" : "#fff", color: selectedHour ? "#fff" : "#64748b", border: `1px solid ${selectedHour ? "#006847" : "#e2e8f0"}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, outline: "none" }}
          >
            <option value="">⏱ horas</option>
            {hourPeriods.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Sub-tab nav */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e2e8f0" }}>
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSub(t.key)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 18px", fontSize: 13, fontWeight: 700, color: sub === t.key ? t.color : "#94a3b8", borderBottom: sub === t.key ? `2px solid ${t.color}` : "2px solid transparent", marginBottom: -2, transition: "color .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Visão Geral ── */}
      {sub === "comp" && (() => {
        const sa = s.a ?? { total: 0, cta: 0, obrigados: 0 };
        const sb = s.b ?? { total: 0, cta: 0, obrigados: 0 };
        const taxaA = sa.total > 0 ? Math.round(sa.obrigados / sa.total * 100) : 0;
        const taxaB = sb.total > 0 ? Math.round(sb.obrigados / sb.total * 100) : 0;

        const ofertaCol = (label: string, color: string, d: { total: number; viu_preco: number; cta: number; obrigados: number }, taxa: number) => (
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.07)", flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14, borderBottom: `2px solid ${color}`, paddingBottom: 8 }}>
              {label}
            </div>
            {[
              { label: "Sessões",           value: d.total,      sub: "telefones capturados" },
              { label: "Chegaram no preço", value: d.viu_preco,  sub: "viram o preço final" },
              { label: "Clicaram no botão", value: d.cta,        sub: "clicaram em comprar" },
              { label: "Obrigados",         value: d.obrigados,  sub: "chegaram na pág. obrigado" },
              { label: "Taxa obrigado",     value: `${taxa}%`,   sub: "sessões → obrigado" },
            ].map(c => (
              <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 12, color: "#475569" }}>{c.label}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color }}>{c.value}</span>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        );

        return (
          <>
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              {ofertaCol("Oferta A — R$12,90", "#CE1126", sa, taxaA)}
              {ofertaCol("Oferta B — R$9,90",  "#92400e", sb, taxaB)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div style={chartBox}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#004030", margin: "0 0 14px" }}>📈 Sessões por dia (últimos 14 dias)</h3>
                <canvas ref={dailyRef} style={{ maxHeight: 220 }} />
              </div>
              <div style={chartBox}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#004030", margin: "0 0 14px" }}>🚪 Funil — onde as pessoas saem</h3>
                <canvas ref={funnelRef} style={{ maxHeight: 220 }} />
              </div>
            </div>
          </>
        );
      })()}

      {/* ── 2ª Figurinha ── */}
      {sub === "segunda" && (() => {
        const seg = data.segunda;
        const base = seg.cliques > 0 ? seg.cliques : 1;
        const steps = [
          { label: "Clicaram no botão",    n: seg.cliques,   color: "#006847", pct: 100 },
          { label: "Iniciaram o quiz",     n: seg.starts,    color: "#6366f1", pct: seg.starts    / base * 100 },
          { label: "Chegaram no preço",    n: seg.viu_preco, color: "#8b5cf6", pct: seg.viu_preco / base * 100 },
          { label: "Clicaram em comprar",  n: seg.cta,       color: "#a855f7", pct: seg.cta       / base * 100 },
          { label: "Obrigados",            n: seg.obrigados, color: "#006847", pct: seg.obrigados / base * 100 },
        ];
        return (
          <div style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
            <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#004030" }}>Funil da 2ª Figurinha</p>
            <div style={{ display: "flex", alignItems: "stretch", background: "#f8fafc", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
              {steps.map((step, i) => (
                <div key={step.label} style={{ flex: 1, padding: "14px 10px", borderLeft: i > 0 ? "1px solid #e2e8f0" : "none" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>{step.label}</div>
                  <div style={{ height: 5, background: "#e2e8f0", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ width: `${Math.min(100, step.pct)}%`, height: "100%", background: step.color, borderRadius: 99, transition: "width .4s" }} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: step.color, lineHeight: 1 }}>{step.n}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{step.pct.toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ==============================
// APIS TAB
// ==============================

function ApisTab() {
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown]   = useState(30);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-stats");
      if (res.status === 401) { dispatchUnauthorized(); return; }
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setApiStats(await res.json());
      setLastUpdate(new Date());
      setCountdown(30);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchStats(); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [fetchStats]);

  return (
    <div style={{ padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#004030", margin: "0 0 4px" }}>Uso de APIs</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
            {lastUpdate
              ? `Atualizado às ${lastUpdate.toLocaleTimeString("pt-BR")} — atualiza em ${countdown}s`
              : "Carregando..."}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          style={{ background: "#006847", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "..." : "↺ Atualizar"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Per key stats */}
      {apiStats && apiStats.perKey.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
          {apiStats.perKey.map(k => (
            <div key={k.api_key_used} style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                API Key {k.api_key_used}
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#004030", lineHeight: 1 }}>{k.total}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, marginBottom: 12 }}>gerações totais</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 14, color: "#334155" }}>
                  <span style={{ fontWeight: 800, color: k.avg_ms < 30000 ? "#006847" : k.avg_ms < 60000 ? "#d97706" : "#dc2626" }}>
                    {k.avg_ms ? (k.avg_ms / 1000).toFixed(1) : "—"}s
                  </span>
                  <span style={{ color: "#94a3b8", fontSize: 11 }}> média</span>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  min {k.min_ms ? (k.min_ms / 1000).toFixed(1) : "—"}s · max {k.max_ms ? (k.max_ms / 1000).toFixed(1) : "—"}s
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, color: "#94a3b8", fontSize: 13, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          Nenhum dado de API disponível ainda.
        </div>
      )}

      {/* Recent generations */}
      {apiStats && apiStats.recentes.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#004030", margin: "0 0 14px" }}>
            Últimas gerações ({apiStats.recentes.length})
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Nome", "Email", "API Key", "Tempo", "Data"].map(h => (
                    <th key={h} style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apiStats.recentes.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", color: "#334155", fontWeight: 600 }}>{r.nome || "—"}</td>
                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{r.email}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ background: "#dbeafe", color: "#CE1126", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        Key {r.api_key_used}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ fontWeight: 700, color: r.generation_ms < 30000 ? "#006847" : r.generation_ms < 60000 ? "#d97706" : "#dc2626" }}>
                        {(r.generation_ms / 1000).toFixed(1)}s
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#94a3b8" }}>
                      {new Date(r.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================
// ORDER BUMPS TAB
// ==============================

const OB_PRODUTOS: Record<string, string> = {
  "3MSNI0": "3× Rifa da Sorte",
  "3MSNI1": "Pacote Embalagem PDF",
  "3MSNI2": "Poster A4",
  "3MSNI3": "10× Rifa da Sorte",
  "3MSNI4": "Figurinha Neymar",
};

interface OBItem {
  id: number;
  order_id: string;
  email: string;
  telefone: string | null;
  nome: string | null;
  offer_name: string;
  offer_hash: string;
  price: number;
  status: string;
  created_at: string;
  manual: boolean;
}

interface OBGroup {
  key: string;
  telefone: string | null;
  email: string;
  nome: string | null;
  lastDate: string;
  products: OBItem[];
}

function groupByPerson(items: OBItem[]): OBGroup[] {
  const map = new Map<string, OBGroup>();
  for (const item of items) {
    const raw = item.telefone ? item.telefone.replace(/\D/g, "") : "";
    const stripped = raw.startsWith("55") && raw.length > 11 ? raw.slice(2) : raw;
    const key = stripped.length >= 10 ? stripped : item.email;
    if (!map.has(key)) {
      map.set(key, { key, telefone: item.telefone, email: item.email, nome: item.nome, lastDate: item.created_at, products: [] });
    }
    const g = map.get(key)!;
    if (item.nome && !g.nome) g.nome = item.nome;
    if (item.created_at > g.lastDate) g.lastDate = item.created_at;
    g.products.push(item);
  }
  return Array.from(map.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

const OB_TAG_COLORS: Record<string, { bg: string; color: string }> = {
  "3MSNI0": { bg: "#fef3c7", color: "#92400e" },
  "3MSNI1": { bg: "#ede9fe", color: "#5b21b6" },
  "3MSNI2": { bg: "#eff6ff", color: "#CE1126" },
  "3MSNI3": { bg: "#fff7ed", color: "#9a3412" },
  "3MSNI4": { bg: "#f0fdf4", color: "#166534" },
};

function OrderBumpsTab() {
  const [items, setItems]     = useState<OBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk]   = useState(false);

  // Form manual
  const [formPhone, setFormPhone]   = useState("");
  const [formNome, setFormNome]     = useState("");
  const [formProd, setFormProd]     = useState("3MSNI2");

  const load = useCallback((q = "") => {
    setLoading(true);
    fetch(`/api/admin/orderbumps${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then(r => { if (r.status === 401) { dispatchUnauthorized(); throw new Error("401"); } return r.json(); })
      .then(d => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => { setSearch(v); load(v); };

  const handleAdd = async () => {
    const phone = formPhone.replace(/\D/g, "");
    if (phone.length < 10) { setSaveErr("Telefone inválido"); return; }
    if (!formProd) { setSaveErr("Selecione um produto"); return; }
    setSaving(true); setSaveErr(null); setSaveOk(false);
    try {
      const res = await fetch("/api/admin/orderbumps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: phone, offer_hash: formProd, nome: formNome }),
      });
      if (res.status === 401) { dispatchUnauthorized(); return; }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Erro"); }
      setSaveOk(true);
      setFormPhone(""); setFormNome("");
      load(search);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover esse acesso manual?")) return;
    await fetch(`/api/admin/orderbumps?id=${id}`, { method: "DELETE" }).catch(() => {});
    load(search);
  };

  const groups = groupByPerson(items);

  return (
    <div style={{ padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#004030", margin: "0 0 4px" }}>
          Order Bumps{" "}
          {groups.length > 0 && <span style={{ color: "#64748b", fontWeight: 500, fontSize: 14 }}>({groups.length} pessoas · {items.length} produtos)</span>}
        </h2>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Produtos adicionais comprados + acessos manuais</p>
      </div>

      {/* Adicionar manual */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.07)", padding: "20px 24px", marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "#004030", margin: "0 0 14px" }}>Adicionar acesso manual</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Telefone *</label>
            <input
              type="tel" inputMode="numeric"
              placeholder="Ex: 11998765432"
              value={formPhone}
              onChange={e => setFormPhone(e.target.value)}
              style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: 170, color: "#004030" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Nome (opcional)</label>
            <input
              type="text"
              placeholder="Nome do cliente"
              value={formNome}
              onChange={e => setFormNome(e.target.value)}
              style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: 180, color: "#004030" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Produto *</label>
            <select
              value={formProd}
              onChange={e => setFormProd(e.target.value)}
              style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#004030", cursor: "pointer" }}
            >
              {Object.entries(OB_PRODUTOS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            style={{
              background: "#CE1126", color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1, height: 36,
            }}
          >
            {saving ? "Salvando..." : "+ Adicionar"}
          </button>
        </div>
        {saveErr && <p style={{ color: "#dc2626", fontSize: 12, margin: "8px 0 0" }}>{saveErr}</p>}
        {saveOk && <p style={{ color: "#006847", fontSize: 12, margin: "8px 0 0" }}>Acesso adicionado com sucesso!</p>}
      </div>

      {/* Busca */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Buscar por telefone, nome, email ou produto..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          style={{
            border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px",
            fontSize: 13, color: "#334155", width: 320, outline: "none",
          }}
        />
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ background: "#fff", borderRadius: 12, padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          Carregando...
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
            <thead>
              <tr>
                {["Data", "Nome", "Telefone", "Email", "Produtos comprados"].map(h => (
                  <th key={h} style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 48, fontSize: 13 }}>Nenhum order bump ainda.</td></tr>
              ) : groups.map(g => (
                <tr key={g.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 11, whiteSpace: "nowrap" }}>
                    {new Date(g.lastDate).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 600 }}>
                    {g.nome || <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {g.telefone ? (
                      <a href={`https://wa.me/${g.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#006847", textDecoration: "none", fontWeight: 600 }}>
                        {g.telefone}
                      </a>
                    ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.email?.startsWith("tel:") ? <span style={{ color: "#cbd5e1" }}>—</span> : g.email}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {g.products.map(item => {
                        const clr = OB_TAG_COLORS[item.offer_hash] || { bg: "#f1f5f9", color: "#334155" };
                        const label = OB_PRODUTOS[item.offer_hash] || item.offer_name;
                        return (
                          <span key={item.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: clr.bg, color: clr.color }}>
                            {label}
                            {item.manual && (
                              <button
                                onClick={() => handleDelete(item.id)}
                                title="Remover acesso manual"
                                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 11, lineHeight: 1, opacity: 0.6, marginLeft: 2 }}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==============================
// LEADS TAB
// ==============================

function LeadsTab() {
  const [data, setData]       = useState<FunilData>(EMPTY_FUNIL);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage]         = useState(0);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/funil?period=all&lite=0")
      .then(r => { if (r.status === 401) { dispatchUnauthorized(); throw new Error("401"); } return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sortedLeads = [...(data.leads ?? [])].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const filteredLeads = search.trim()
    ? sortedLeads.filter(l => {
        const q = search.toLowerCase().trim();
        const nome = (l.nome || "").toLowerCase();
        const num  = String(l.email || "").replace(/\D/g, "");
        return nome.includes(q) || num.includes(q.replace(/\D/g, "")) || (l.email || "").toLowerCase().includes(q);
      })
    : sortedLeads;

  const totalLeads  = filteredLeads.length;
  const totalPages  = Math.max(1, Math.ceil(totalLeads / pageSize));
  const pagedLeads  = filteredLeads.slice(page * pageSize, page * pageSize + pageSize);

  const downloadCSV = () => {
    const rows = [
      ["Nome", "Número", "Último passo", "CTA", "Data"].join(","),
      ...data.leads.map(l => [
        l.nome || "",
        l.email || "",
        STEP_LABEL[l.step] || l.step,
        l.cta_clicked ? "Sim" : "Não",
        new Date(l.updated_at).toLocaleString("pt-BR"),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" }));
    a.download = "leads-figurinha.csv";
    a.click();
  };

  return (
    <div style={{ padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#004030", margin: "0 0 4px" }}>
            Leads{" "}
            {search.trim()
              ? <span style={{ color: "#64748b", fontWeight: 500, fontSize: 14 }}>{totalLeads} de {sortedLeads.length}</span>
              : totalLeads > 0 && <span style={{ color: "#64748b", fontWeight: 500, fontSize: 14 }}>({totalLeads})</span>}
          </h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Sessões com email capturado</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Buscar por nome ou número..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            style={{
              border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px",
              fontSize: 12, color: "#334155", outline: "none", width: 210,
            }}
          />
          <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Mostrar:</label>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "#334155", cursor: "pointer" }}
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
          <button onClick={downloadCSV}
            style={{ background: "#006847", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            ⬇ CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: 12, padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          Carregando leads...
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
            <thead>
              <tr>
                {["Data", "Nome", "Número", "Último Passo", "CTA", "Oferta"].map(h => (
                  <th key={h} style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: 48, fontSize: 13 }}>
                    Nenhum lead ainda.
                  </td>
                </tr>
              ) : pagedLeads.map(l => (
                <tr key={l.session_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 11, whiteSpace: "nowrap" }}>
                    {new Date(l.updated_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 600 }}>
                    {l.nome || <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {l.email && l.email.replace(/\D/g, "").length >= 10 ? (
                      <a href={`https://wa.me/${l.email.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#006847", textDecoration: "none", fontWeight: 600 }}>
                        {l.email}
                      </a>
                    ) : (
                      <span style={{ color: "#64748b" }}>{l.email}</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "#f1f5f9", color: "#475569" }}>
                      {STEP_LABEL[l.step] || l.step}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {l.cta_clicked
                      ? <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "#d4edda", color: "#004f35" }}>✓ Clicou</span>
                      : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {(() => {
                      const cls = classifyPrice(l.price_paid);
                      if (!cls) return <span style={{ color: "#cbd5e1" }}>—</span>;
                      const MAP = {
                        A:       { bg: "#eff6ff", color: "#CE1126", label: "Link A" },
                        B:       { bg: "#fef3c7", color: "#92400e", label: "Link B" },
                        segunda: { bg: "#ede9fe", color: "#7c3aed", label: "2ª Fig." },
                      } as const;
                      const m = MAP[cls];
                      return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: m.bg, color: m.color }}>{m.label}</span>;
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalLeads)} de {totalLeads}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setPage(0)} disabled={page === 0}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: page === 0 ? "default" : "pointer", color: page === 0 ? "#cbd5e1" : "#334155", background: "#fff" }}>«</button>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: page === 0 ? "default" : "pointer", color: page === 0 ? "#cbd5e1" : "#334155", background: "#fff" }}>‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                  const p = start + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", background: p === page ? "#006847" : "#fff", color: p === page ? "#fff" : "#334155", fontWeight: p === page ? 700 : 400 }}>
                      {p + 1}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: page === totalPages - 1 ? "default" : "pointer", color: page === totalPages - 1 ? "#cbd5e1" : "#334155", background: "#fff" }}>›</button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: page === totalPages - 1 ? "default" : "pointer", color: page === totalPages - 1 ? "#cbd5e1" : "#334155", background: "#fff" }}>»</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==============================
// MAIN COMPONENT
// ==============================

const UNAUTH_EVENT = "painel:unauthorized";
function dispatchUnauthorized() {
  window.dispatchEvent(new Event(UNAUTH_EVENT));
}

export default function Painel() {
  const [user, setUser]   = useState<AdminUser | null>(null);
  const [tab, setTab]     = useState<Tab>("figurinhas");
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    localStorage.removeItem("painel_user");
    setUser(null);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("painel_user");
    if (saved) setUser(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    window.addEventListener(UNAUTH_EVENT, logout);
    return () => window.removeEventListener(UNAUTH_EVENT, logout);
  }, [logout]);

  const handleLogin = (u: AdminUser) => {
    localStorage.setItem("painel_user", u);
    setUser(u);
  };

  if (!ready) return null;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "#f1f5f9", fontSize: 14, color: "#002e20",
    }}>
      <Sidebar tab={tab} onTab={setTab} user={user} onLogout={logout} />
      <main style={{ flex: 1, overflowY: "auto" }}>
        {tab === "figurinhas"  && <FigurinhasTab />}
        {tab === "metricas"    && <MetricasTab />}
        {tab === "apis"        && <ApisTab />}
        {tab === "leads"       && <LeadsTab />}
        {tab === "orderbumps"  && <OrderBumpsTab />}
      </main>
    </div>
  );
}
