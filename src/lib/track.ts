export function track(step: string, opts?: { email?: string; nome?: string; oferta?: string }) {
  try {
    const sid = sessionStorage.getItem("_fsid");
    if (!sid) return;
    const payload: Record<string, string> = { session_id: sid, step };
    if (opts?.email)  payload.email  = opts.email;
    if (opts?.nome)   payload.nome   = opts.nome;
    if (opts?.oferta) payload.oferta = opts.oferta;
    navigator.sendBeacon(
      "/api/track",
      new Blob([JSON.stringify(payload)], { type: "application/json" })
    );
  } catch { /* ignora */ }
}
