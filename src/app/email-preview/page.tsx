// Página local para visualizar os templates de email
// Acesse: http://localhost:3000/email-preview

const BASE_URL = "https://gerarfigurinhas.vercel.app";
const NOME = "João Silva";
const PREVIEW_URL = "https://gerarfigurinhas.vercel.app/sample-sticker.png";

function htmlConfirmacao() {
  const dlPng = `${BASE_URL}/api/download?url=exemplo-png&name=minha-figurinha-copa2026.png`;
  const dlPdf = `${BASE_URL}/api/download?url=exemplo-pdf&name=figurinhas-impressao-copa2026.pdf`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f4;">
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;padding:32px;">
      <h1 style="color:#000000;font-size:32px;margin:0 0 8px 0;text-align:center;">SUA FIGURINHA CHEGOOOL!⚽</h1>
      <p style="font-size:18px;color:#000000;margin:0 0 8px 0;text-align:center;">Ola, <strong>${NOME}</strong>!</p>
      <p style="font-size:16px;color:#000000;margin:0 0 24px 0;text-align:center;">Sua figurinha personalizada da Copa do Mundo 2026 esta pronta!</p>
      <div style="text-align:center;margin-bottom:12px;">
        <a href="${dlPng}" style="display:inline-block;background:#000000;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:1px;">BAIXAR FIGURINHA</a>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${dlPdf}" style="display:inline-block;background:#ffffff;color:#000000;font-weight:bold;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:1px;border:2px solid #000000;">BAIXAR PDF PARA IMPRESSÃO</a>
      </div>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
      <p style="font-size:15px;color:#000000;margin:0 0 16px 0;text-align:center;">Conhece alguem que ia amar ter uma figurinha personalizada?</p>
      <div style="text-align:center;">
        <a href="${BASE_URL}/" style="display:inline-block;background:#000000;color:#ffffff;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">CRIAR NOVA FIGURINHA</a>
      </div>
      <p style="font-size:12px;color:#999999;margin:24px 0 0 0;text-align:center;">Figurinha Copa 2026 — Arquivo digital para impressao.</p>
    </div>
  </body></html>`;
}

function htmlLoading() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f4;">
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;padding:32px;">
      <h1 style="color:#000000;text-align:center;font-size:26px;margin:0 0 16px 0;">⚽ Sua figurinha ficou pelo caminho!</h1>
      <p style="font-size:16px;text-align:center;color:#000000;margin:0 0 24px 0;">
        Oi! Voce comecou a criar a figurinha de <strong>${NOME}</strong> mas saiu antes de ver o resultado.<br/><br/>
        E so clicar no botao abaixo e refazer — leva menos de 1 minuto!
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${BASE_URL}" style="display:inline-block;background:#000000;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:1px;">CRIAR MINHA FIGURINHA</a>
      </div>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;"/>
      <p style="font-size:12px;text-align:center;color:#999999;margin:0;">${BASE_URL.replace("https://", "")}</p>
    </div>
  </body></html>`;
}

function htmlPreview() {
  const linkVer = `${BASE_URL}/preview?img=${encodeURIComponent(PREVIEW_URL)}&nome=${encodeURIComponent(NOME)}&id=exemplo`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f4;">
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;padding:32px;">
      <h1 style="color:#000000;text-align:center;font-size:26px;margin:0 0 16px 0;">⚽ Sua figurinha ainda esta aqui!</h1>
      <p style="font-size:16px;text-align:center;color:#000000;margin:0 0 20px 0;">
        A figurinha de <strong>${NOME}</strong> foi gerada e esta esperando por voce.
      </p>
      <div style="text-align:center;margin:20px 0;">
        <img src="https://via.placeholder.com/160x240?text=Figurinha" width="160" height="240" alt="Sua figurinha" style="border-radius:8px;border:2px solid #e0e0e0;display:block;margin:0 auto;"/>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${linkVer}" style="display:inline-block;background:#000000;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:1px;">QUERO MINHA FIGURINHA</a>
      </div>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;"/>
      <p style="font-size:12px;text-align:center;color:#999999;margin:0;"><a href="${BASE_URL}" style="color:#999999;">Criar nova figurinha</a></p>
    </div>
  </body></html>`;
}

export default function EmailPreviewPage() {
  const emails = [
    { titulo: "1. Confirmação de compra (recebe a figurinha)", html: htmlConfirmacao() },
    { titulo: "2. Recuperação — saiu durante o loading", html: htmlLoading() },
  ];

  return (
    <div style={{ background: "#e5e5e5", minHeight: "100vh", padding: "40px 20px", fontFamily: "Arial" }}>
      <h1 style={{ textAlign: "center", marginBottom: 40 }}>Preview de Emails</h1>
      {emails.map((email) => (
        <div key={email.titulo} style={{ maxWidth: 700, margin: "0 auto 60px auto" }}>
          <h2 style={{ fontSize: 16, marginBottom: 12, color: "#333" }}>{email.titulo}</h2>
          <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <iframe
              srcDoc={email.html}
              style={{ width: "100%", height: 500, border: "none", display: "block" }}
              title={email.titulo}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
