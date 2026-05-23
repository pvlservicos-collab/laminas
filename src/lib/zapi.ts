// Z-API WhatsApp Integration
// Ativado automaticamente quando ZAPI_INSTANCE_ID e ZAPI_TOKEN estão configurados

const ZAPI_BASE = "https://api.z-api.io/instances";

// Templates de saudação (sem CTA — vai no final)
const saudacoes = [
  `Olá {nome}! ⚽

Sua figurinha personalizada da Copa 2026 está pronta!

{materiais}

Confira abaixo:`,

  `E aí {nome}! ⚽

Chegou a hora! Sua figurinha da Copa 2026 ficou incrível!

{materiais}

Confira abaixo:`,

  `{nome}, sua figurinha personalizada ficou demais! ⚽

{materiais}

Confira abaixo:`,
];

// CTA vai como ÚLTIMA mensagem
const ctas = [
  `Obrigado pela compra! 🇧🇷

Conhece alguém que ia amar ter uma figurinha personalizada? Indique:
https://gerarfigurinhas.vercel.app/`,

  `Valeu pela confiança! 🇧🇷

Quer presentear alguém especial? Crie outra figurinha:
https://gerarfigurinhas.vercel.app/`,

  `Foi um prazer criar essa figurinha! 🇧🇷

Indique pra um amigo e faça a alegria de alguém:
https://gerarfigurinhas.vercel.app/`,
];

function formatPhone(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.length <= 11) clean = "55" + clean;
  return clean;
}

export function isZapiEnabled(): boolean {
  return !!(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN);
}

async function zapiPost(endpoint: string, body: Record<string, unknown>): Promise<boolean> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  if (!instanceId || !token) return false;

  try {
    const res = await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ZAPI_CLIENT_TOKEN ? { "Client-Token": process.env.ZAPI_CLIENT_TOKEN } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Z-API erro ${endpoint}:`, res.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Z-API falha ${endpoint}:`, err);
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface ZapiMaterial {
  tipo: "figurinha" | "pdf" | "pacotinho" | "poster" | "album";
  url: string;
  nome?: string;
}

export async function enviarWhatsApp(
  telefone: string,
  nomeCliente: string,
  materiais: ZapiMaterial[]
): Promise<boolean> {
  const phone = formatPhone(telefone);
  if (!phone || phone.length < 12) {
    console.error("Z-API: telefone invalido:", telefone);
    return false;
  }

  if (materiais.length === 0) {
    console.error("Z-API: nenhum material pra enviar");
    return false;
  }

  console.log(`Z-API: enviando ${materiais.length} material(is) para ${phone} (${nomeCliente})...`);

  // Montar lista de materiais
  const linhas: string[] = [];
  for (const m of materiais) {
    switch (m.tipo) {
      case "figurinha": linhas.push("🏆 Figurinha avulsa"); break;
      case "pdf": linhas.push("📄 PDF para impressão (A4)"); break;
      case "pacotinho": linhas.push("📦 Pacotinho Oficial Copa 2026"); break;
      case "poster": linhas.push("🖼 Poster A2 alta resolução"); break;
      case "album": linhas.push("📚 Album Completo Copa 2026"); break;
    }
  }

  const materiaisTexto = materiais.length === 1
    ? "Segue seu material abaixo:"
    : `Seguem seus ${materiais.length} materiais:\n\n${linhas.join("\n")}`;

  // 1. SAUDAÇÃO + lista de materiais
  const idx = Math.floor(Math.random() * saudacoes.length);
  const mensagem = saudacoes[idx]
    .replace(/{nome}/g, nomeCliente)
    .replace(/{materiais}/g, materiaisTexto);

  const ok = await zapiPost("send-text", { phone, message: mensagem });
  if (!ok) return false;

  // 2. DOCUMENTOS (no meio)
  for (let i = 0; i < materiais.length; i++) {
    await delay(3000);
    const m = materiais[i];

    if (m.tipo === "figurinha") {
      await zapiPost("send-image", {
        phone,
        image: m.url,
        caption: `Figurinha de ${nomeCliente} ⚽`,
      });
    } else if (m.tipo === "album") {
      await zapiPost("send-text", {
        phone,
        message: `📚 Album Completo Copa 2026\n\nBaixe todos os arquivos do album:\n${m.url}`,
      });
    } else {
      const fileName = m.tipo === "pacotinho"
        ? "pacotinho-copa-2026"
        : m.tipo === "poster"
        ? m.nome || `poster-a2-${nomeCliente.toLowerCase().replace(/\s+/g, "-")}`
        : m.nome || `figurinhas-impressao-${nomeCliente.toLowerCase().replace(/\s+/g, "-")}`;

      await zapiPost("send-document/pdf", {
        phone,
        document: m.url,
        fileName,
      });
    }
  }

  // 3. CTA (por último)
  await delay(3000);
  const ctaIdx = Math.floor(Math.random() * ctas.length);
  await zapiPost("send-text", { phone, message: ctas[ctaIdx] });

  console.log(`Z-API: envio completo para ${phone} (${nomeCliente}) - ${materiais.length} arquivo(s)`);
  return true;
}
