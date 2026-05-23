import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import sharp from "sharp";
import postgres from "postgres";
import { getDb } from "@/lib/db";

export const maxDuration = 300;

function formatBirthDate(dataNascimento: string): string {
  const birth = new Date(dataNascimento);
  return `${String(birth.getDate()).padStart(2, "0")}-${String(birth.getMonth() + 1).padStart(2, "0")}-${birth.getFullYear()}`;
}

let cachedModeloBuffer: Buffer | null = null;

async function getModeloComprimido(): Promise<Buffer> {
  if (cachedModeloBuffer) return cachedModeloBuffer;

  let rawBuffer: Buffer;
  try {
    const modeloPath = join(process.cwd(), "public", "modelo-figurinha.jpg");
    rawBuffer = readFileSync(modeloPath);
    console.log("modelo: carregado do filesystem");
  } catch (fsErr) {
    // Fallback para ambientes serverless onde o filesystem pode não ter o public/
    const host = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
    console.log(`modelo: filesystem falhou (${fsErr instanceof Error ? fsErr.message : fsErr}), buscando via HTTP de ${host}`);
    const res = await fetch(`${host}/modelo-figurinha.jpg`);
    if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar modelo-figurinha.jpg`);
    rawBuffer = Buffer.from(await res.arrayBuffer());
  }

  cachedModeloBuffer = await sharp(rawBuffer).resize(512).webp({ quality: 85 }).toBuffer();
  return cachedModeloBuffer;
}

function ms(start: number) { return `${Date.now() - start}ms`; }

// Rate limit simples em memória
const requestLog = new Map<string, number[]>();
function checkRateLimit(ip: string, maxRequests = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(ip) || [];
  const recent = timestamps.filter(t => now - t < windowMs);
  if (recent.length >= maxRequests) return false;
  recent.push(now);
  requestLog.set(ip, recent);
  return true;
}

// Sanitizar input — só letras, números, espaços, acentos e hífens
function sanitizeInput(value: string, maxLen: number): string {
  return value.replace(/[^a-zA-ZÀ-ÿ0-9\s\-'.]/g, "").slice(0, maxLen).trim();
}

function getOpenAIKeys(): string[] {
  const keys: string[] = [];
  if (process.env.OPENAI_API_KEY)   keys.push(process.env.OPENAI_API_KEY);
  if (process.env.OPENAI_API_KEY_2) keys.push(process.env.OPENAI_API_KEY_2);
  if (process.env.OPENAI_API_KEY_3) keys.push(process.env.OPENAI_API_KEY_3);
  if (process.env.OPENAI_API_KEY_4) keys.push(process.env.OPENAI_API_KEY_4);
  return keys;
}

// Rastreia gerações ativas por key — garante que requests simultâneos usem keys diferentes
const keyInFlight = new Map<number, number>();
let rrBase = 0; // round-robin como desempate quando todas têm carga igual

function pickBestKey(total: number): number {
  let best = rrBase % total;
  let bestLoad = keyInFlight.get(best) ?? 0;
  for (let i = 1; i < total; i++) {
    const idx = (rrBase + i) % total;
    const load = keyInFlight.get(idx) ?? 0;
    if (load < bestLoad) { bestLoad = load; best = idx; }
  }
  rrBase = (rrBase + 1) % total;
  return best;
}

export async function POST(req: NextRequest) {
  const apiKeys = getOpenAIKeys();
  if (apiKeys.length === 0) {
    return NextResponse.json({ error: "Serviço indisponível" }, { status: 500 });
  }
  // Rate limit por IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip, 10, 60000)) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde 1 minuto." }, { status: 429 });
  }

  let body: { nome: string; dataNascimento: string; telefone?: string; clube: string; jogadorFavorito: string; peso?: string; altura?: string; fotoBase64: string; errorTimestamp?: string; retryAttempt?: number; };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { nome, dataNascimento, telefone, clube, jogadorFavorito, peso, altura, fotoBase64, errorTimestamp, retryAttempt } = body;
  if (!nome || !dataNascimento || !clube || !fotoBase64) {
    console.error("Dados incompletos:", { nome: !!nome, dataNascimento: !!dataNascimento, clube: !!clube, fotoBase64: !!fotoBase64 });
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // Validações server-side
  const nomeSafe = sanitizeInput(nome, 50);
  const clubeSafe = sanitizeInput(clube, 50);
  const jogadorSafe = sanitizeInput(jogadorFavorito || "", 50);

  if (nomeSafe.length < 2 || clubeSafe.length < 2) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Validar data
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dataNascimento)) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  // Validar base64 — máx 5MB decodificado
  if (fotoBase64.length > 7_000_000) {
    return NextResponse.json({ error: "Imagem muito grande" }, { status: 400 });
  }

  let fotoBuffer: Buffer;
  try {
    fotoBuffer = Buffer.from(fotoBase64, "base64");
    if (fotoBuffer.length > 5_000_000) {
      return NextResponse.json({ error: "Imagem muito grande" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Imagem inválida" }, { status: 400 });
  }

  const t0 = Date.now();
  const sql = getDb();
  const telefoneSafe = telefone ? telefone.replace(/\D/g, "").slice(0, 20) : null;

  // Tudo que pode rodar antes da API roda em paralelo
  const rascunhoPromise = telefoneSafe
    ? sql<{ id: number }[]>`
        INSERT INTO pedidos (nome, data_nascimento, clube, jogador_favorito, telefone, status)
        VALUES (${nomeSafe}, ${dataNascimento}, ${clubeSafe}, ${jogadorSafe}, ${telefoneSafe}, 'gerando')
        RETURNING id
      `.catch(() => null)
    : Promise.resolve(null);

  const fotoCompressPromise = sharp(fotoBuffer).resize(512).jpeg({ quality: 80 }).toBuffer()
    .catch(() => fotoBuffer);

  const [fotoBufferComprimido, modeloBuffer, rascunhoRows] = await Promise.all([
    fotoCompressPromise,
    getModeloComprimido(),
    rascunhoPromise,
  ]);

  const rascunhoId: number | null = Array.isArray(rascunhoRows) ? (rascunhoRows[0]?.id ?? null) : null;
  console.log(`pré-geração paralela: ${ms(t0)} | rascunhoId=${rascunhoId}`);

  const nomeUpper = nomeSafe.toUpperCase();
  const clubeFormatted = clubeSafe.toUpperCase();
  const pesoSafe  = peso  ? sanitizeInput(peso,  10) : null;
  const alturaSafe = altura ? sanitizeInput(altura, 10) : null;
  const infoLine = [
    formatBirthDate(dataNascimento),
    alturaSafe ? `${alturaSafe} m` : null,
    pesoSafe   ? `${pesoSafe} kg` : null,
  ].filter(Boolean).join(" | ");

  const prompt = `You are given two images:
- Image 1: A photograph of a person (the SUBJECT).
- Image 2: A collectible sports sticker card (the TEMPLATE).

TASK: Create a new version of the sticker card (Image 2) featuring the person from Image 1.

BEFORE STARTING — ANALYZE Image 1:
Carefully observe the subject's face, head size, shoulder width, and overall body frame. Determine whether this person is a child or an adult. This observation governs everything you draw.

INSTRUCTIONS:

1. REMOVE the adult athlete from Image 2 entirely.

2. GENERATE a chest-up portrait of the subject wearing the yellow and green Brazil 2026 national team jersey (yellow body #FFDF00, green collar and sleeves #009C3B, CBF badge on left chest), facing forward, arms down.

   BODY PROPORTIONS — CRITICAL:
   - Use the subject's FACE from Image 1 as your scale anchor. The shoulders, torso, and jersey must be sized to fit that face naturally.
   - If the subject is a child: draw narrow child-sized shoulders, small torso, jersey scaled to a child's frame. The head-to-shoulder ratio must match real child anatomy — wide head relative to narrow shoulders.
   - If the subject is an adult: draw standard adult proportions.
   - NEVER place a child's face on adult-width shoulders. If the face in Image 1 is small and round (child), the body must also be small. Anatomical correctness for the subject's actual age is mandatory.

3. FACE: reproduce the subject's face from Image 1 exactly — same features, expression, hair, skin tone, eyes. Do not alter it.

4. Place the portrait centered where the original athlete was in the card.

5. Keep ALL other card elements unchanged: turquoise background, green "26" graphic, icons, emblems, flag, vertical text, logos, borders, card edges, bottom text area.

6. Update the text fields:
[NAME]: ${nomeUpper}
[INFO]: ${infoLine}
[CLUB]: ${clubeFormatted}
${pesoSafe || alturaSafe ? `Player stats for reference: ${[alturaSafe ? `height ${alturaSafe} cm` : null, pesoSafe ? `weight ${pesoSafe} kg` : null].filter(Boolean).join(", ")}.` : ""}

The result must look like a real printed collectible sticker card. The portrait must be anatomically correct for the subject's real age and body type as shown in Image 1.`;

  // Escolhe a key com menos gerações ativas; incrementa antes de entrar no try
  const startIdx = pickBestKey(apiKeys.length);
  keyInFlight.set(startIdx, (keyInFlight.get(startIdx) ?? 0) + 1);
  console.log(`key escolhida: ${startIdx + 1} | in-flight: [${Array.from({length: apiKeys.length}, (_, i) => keyInFlight.get(i) ?? 0).join(",")}]`);

  try {
    let b64Result: string | null = null;
    let successKeyIdx = -1;
    const genStart = Date.now();
    let attempt = 0;
    const TIMEOUT_MS = 250_000;
    // Keys permanentemente mortas nesta requisição (auth inválida, quota zerada)
    const deadKeys = new Set<number>();

    console.log(`API start — ${apiKeys.length} key(s), key ${startIdx + 1} primeiro | total até aqui: ${ms(t0)}`);

    while (!b64Result && (Date.now() - genStart) < TIMEOUT_MS) {
      const keyIdx = (startIdx + attempt) % apiKeys.length;

      if (deadKeys.has(keyIdx)) {
        // Todas as keys mortas → sem esperança
        if (deadKeys.size >= apiKeys.length) break;
        attempt++;
        continue;
      }

      const openai = new OpenAI({ apiKey: apiKeys[keyIdx] });
      try {
        const fotoFile = await toFile(fotoBufferComprimido, "foto.jpg", { type: "image/jpeg" });
        const modeloFile = await toFile(modeloBuffer, "modelo.webp", { type: "image/webp" });

        const response = await openai.images.edit({
          model: "gpt-image-2",
          image: [fotoFile, modeloFile],
          prompt,
          size: "1024x1536",
        });
        const candidate = response.data?.[0]?.b64_json;
        if (candidate) {
          b64Result = candidate;
          successKeyIdx = keyIdx;
          console.log(`API ok — key ${keyIdx + 1}, tentativa ${attempt + 1} | API: ${ms(genStart)} | total: ${ms(t0)}`);
        }
      } catch (apiErr: unknown) {
        const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
        const status = (apiErr as { status?: number }).status ?? 0;
        if (status === 401 || status === 403 || status === 402) {
          // Key inválida ou quota zerada — não adianta tentar de novo
          deadKeys.add(keyIdx);
          console.log(`Key ${keyIdx + 1} morta (${status}): ${errMsg.slice(0, 80)}`);
        } else if (status === 429) {
          // Rate limit — espera 5s antes de tentar outra key
          console.log(`Key ${keyIdx + 1} rate-limited, aguardando 5s...`);
          await new Promise(r => setTimeout(r, 5000));
        } else {
          console.log(`Key ${keyIdx + 1} tentativa ${attempt + 1} erro (${status}): ${errMsg.slice(0, 80)}`);
        }
      }
      attempt++;
    }

    const generationMs = Date.now() - genStart;

    if (!b64Result) {
      return NextResponse.json({ error: "Falha na geração" }, { status: 422 });
    }

    const stickerId = randomUUID();
    const stickerBuffer = Buffer.from(b64Result, "base64");

    const createPreview = async (): Promise<Buffer | null> => {
      try {
        // 1024x1536 → resize 400 → 400x600 (ratio 2:3 fixo)
        const watermarkSvg = Buffer.from(`<svg width="400" height="600"><defs><pattern id="wm" x="0" y="0" width="200" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><text x="100" y="40" font-family="Arial" font-size="22" fill="rgba(255,255,255,0.45)" font-weight="900" text-anchor="middle">PREVIEW</text><text x="10" y="70" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.3)">minha-figurinha-copa2026</text></pattern></defs><rect width="100%" height="100%" fill="url(#wm)"/></svg>`);
        return await sharp(stickerBuffer)
          .resize(400)
          .composite([{ input: watermarkSvg, blend: "over" }])
          .jpeg({ quality: 60 })
          .toBuffer();
      } catch { return null; }
    };

    const tBlob = Date.now();
    const [blob, previewBuffer] = await Promise.all([
      put(`figurinhas/${stickerId}.png`, stickerBuffer, { access: "public", contentType: "image/png" }),
      createPreview(),
    ]);

    const previewBlob = previewBuffer
      ? await put(`previews/${stickerId}.jpg`, previewBuffer, { access: "public", contentType: "image/jpeg" }).catch(() => null)
      : null;

    console.log(`blob+preview: ${ms(tBlob)}`);
    const finalPreviewUrl = previewBlob?.url ?? blob.url;

    // Atualizar rascunho 'gerando' → 'pendente', ou inserir novo se não tem rascunho
    if (rascunhoId) {
      await sql`UPDATE pedidos SET
            sticker_id = ${stickerId}, sticker_url = ${blob.url}, preview_url = ${finalPreviewUrl},
            status = 'pendente', api_key_used = ${successKeyIdx + 1}, generation_ms = ${generationMs}
          WHERE id = ${rascunhoId}`
        .catch(e => console.error("DB update rascunho erro:", e));
    } else {
      await sql`INSERT INTO pedidos (nome, data_nascimento, clube, jogador_favorito, telefone, sticker_id, sticker_url, preview_url, status, api_key_used, generation_ms)
          VALUES (${nomeSafe}, ${dataNascimento}, ${clubeSafe}, ${jogadorSafe}, ${telefoneSafe}, ${stickerId}, ${blob.url}, ${finalPreviewUrl}, 'pendente', ${successKeyIdx + 1}, ${generationMs})`
        .catch(e => console.error("DB insert erro:", e));
    }

    console.log(`Figurinha salva: ${stickerId} | TOTAL: ${ms(t0)}`);
    return NextResponse.json({
      imageBase64: b64Result,
      mimeType: "image/png",
      stickerId,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("OUTER CATCH — erro na geração:", errMsg, errStack ?? "");
    return NextResponse.json({ error: "Erro na geração. Tente novamente." }, { status: 500 });
  } finally {
    // Libera a key independente de sucesso ou erro
    keyInFlight.set(startIdx, Math.max(0, (keyInFlight.get(startIdx) ?? 1) - 1));
  }
}
