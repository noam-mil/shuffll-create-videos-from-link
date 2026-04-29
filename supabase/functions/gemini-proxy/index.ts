import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.2.0';

// Vertex AI config
const VERTEX_SA_JSON = Deno.env.get('VERTEX_SA_JSON') || '';
const PROJECT_ID = 'nth-rookery-476315-e5';
const REGION = 'us-central1';
const VERTEX_HOST = `${REGION}-aiplatform.googleapis.com`;

// Imagen 3 — pure text-to-image generation (no reference images)
const IMAGEN_MODEL = 'imagen-3.0-generate-002';
const IMAGEN_ENDPOINT = `https://${VERTEX_HOST}/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${IMAGEN_MODEL}:predict`;

// Nano Banana (Gemini 2.5 Flash Image) — image editing with reference images
const NANO_BANANA_MODEL = 'gemini-2.5-flash-image';
const NANO_BANANA_ENDPOINT = `https://${VERTEX_HOST}/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${NANO_BANANA_MODEL}:generateContent`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token cache
let tokenCache: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.exp) {
    return tokenCache.token;
  }

  const sa = JSON.parse(VERTEX_SA_JSON);
  const privateKey = await importPKCS8(sa.private_key, 'RS256');

  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const tokenData = await tokenRes.json();
  tokenCache = {
    token: tokenData.access_token,
    exp: Date.now() + (tokenData.expires_in - 60) * 1000,
  };

  return tokenCache.token;
}

/** Strip data URL prefix, return raw base64 */
function stripDataPrefix(src: string): string {
  if (src.startsWith('data:')) {
    return src.split(',')[1] || src;
  }
  return src;
}

function getMimeFromDataUrl(src: string): string {
  if (src.startsWith('data:')) {
    const match = src.match(/data:([^;]+)/);
    return match?.[1] || 'image/jpeg';
  }
  return 'image/jpeg';
}

/** Convert ArrayBuffer to base64 — safe for large buffers (no spread operator) */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // 32KB chunks
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

/** Fetch an image URL and return { base64, mimeType } */
async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    const data = arrayBufferToBase64(buf);
    return { data, mimeType };
  } catch {
    return null;
  }
}

/**
 * Route: if any reference image is provided → Nano Banana (editing)
 * Otherwise → Imagen 3 (pure generation)
 */
function hasReferenceImage(referenceUrl?: string): boolean {
  return !!(referenceUrl && referenceUrl.length > 0);
}

// ──────────────────────────────────────────────────────────────────
// Imagen 3 — text-to-image generation
// ──────────────────────────────────────────────────────────────────
async function callImagen(
  accessToken: string,
  prompt: string,
  brandColors?: any,
  description?: string,
): Promise<Response> {
  const promptParts: string[] = [];
  promptParts.push('Generate a vertical portrait image in 9:16 aspect ratio (1080x1920 pixels). Do NOT include any text, titles, headings, or written words in the image.');

  if (brandColors) {
    promptParts.push(`Use these brand colors: Primary ${brandColors.primary}, Secondary ${brandColors.secondary}, Accent ${brandColors.accent}.`);
  }
  if (prompt) {
    promptParts.push(prompt);
  }
  if (description) {
    promptParts.push(`Additional context: ${description}`);
  }

  const imagenRes = await fetch(IMAGEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      instances: [{ prompt: promptParts.join('\n') }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '9:16',
        personGeneration: 'allow_all',
      },
    }),
  });

  if (!imagenRes.ok) {
    const errText = await imagenRes.text();
    return new Response(
      JSON.stringify({ error: `Imagen API error: ${imagenRes.status}`, details: errText }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const json = await imagenRes.json();
  const prediction = json?.predictions?.[0];

  if (!prediction?.bytesBase64Encoded) {
    return new Response(
      JSON.stringify({ error: 'No image in Imagen response', raw: json }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({
      image: prediction.bytesBase64Encoded,
      mimeType: prediction.mimeType || 'image/png',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ──────────────────────────────────────────────────────────────────
// Nano Banana (Gemini 2.5 Flash Image) — image editing
// ──────────────────────────────────────────────────────────────────
async function callNanoBanana(
  accessToken: string,
  prompt: string,
  referenceUrl: string,
  referenceUrl2?: string,
  logo?: { data: string; mime: string },
  brandColors?: any,
  description?: string,
): Promise<Response> {
  const parts: any[] = [];

  // Brand colors instruction
  if (brandColors) {
    parts.push({
      text: `Brand colors to use: Primary ${brandColors.primary}, Secondary ${brandColors.secondary}, Accent ${brandColors.accent}.`,
    });
  }

  // Primary reference image
  if (referenceUrl.startsWith('data:')) {
    parts.push({
      text: 'Use this reference image as the visual basis. Match its style, composition, and layout closely:',
    });
    parts.push({
      inlineData: {
        mimeType: getMimeFromDataUrl(referenceUrl),
        data: stripDataPrefix(referenceUrl),
      },
    });
  } else {
    // Fetch the image from URL (e.g. Supabase Storage)
    const fetched = await fetchImageAsBase64(referenceUrl);
    if (fetched) {
      parts.push({ text: 'Use this reference image as the visual basis. Match its style, composition, and layout closely:' });
      parts.push({ inlineData: { mimeType: fetched.mimeType, data: fetched.data } });
    }
  }

  // Second reference image
  if (referenceUrl2) {
    if (referenceUrl2.startsWith('data:')) {
      parts.push({ text: 'Additional reference image:' });
      parts.push({
        inlineData: {
          mimeType: getMimeFromDataUrl(referenceUrl2),
          data: stripDataPrefix(referenceUrl2),
        },
      });
    } else {
      const fetched2 = await fetchImageAsBase64(referenceUrl2);
      if (fetched2) {
        parts.push({ text: 'Additional reference image:' });
        parts.push({ inlineData: { mimeType: fetched2.mimeType, data: fetched2.data } });
      }
    }
  }

  // Logo — can be { data, mime } or { url } (when loaded from storage)
  if (logo?.data && logo?.mime) {
    parts.push({ text: 'This is the brand logo. Incorporate it naturally:' });
    parts.push({ inlineData: { mimeType: logo.mime, data: logo.data } });
  } else if (logo?.url) {
    const fetchedLogo = await fetchImageAsBase64(logo.url);
    if (fetchedLogo) {
      parts.push({ text: 'This is the brand logo. Incorporate it naturally:' });
      parts.push({ inlineData: { mimeType: fetchedLogo.mimeType, data: fetchedLogo.data } });
    }
  }

  // Format instruction
  parts.push({
    text: 'Generate a vertical portrait image in 9:16 aspect ratio (1080x1920 pixels). Do NOT include any text, titles, headings, or written words in the image.',
  });

  // Main prompt
  if (prompt) {
    parts.push({ text: prompt });
  }

  // Description
  if (description) {
    parts.push({ text: `Additional context: ${description}` });
  }

  const nanoBananaRes = await fetch(NANO_BANANA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });

  if (!nanoBananaRes.ok) {
    const errText = await nanoBananaRes.text();
    return new Response(
      JSON.stringify({ error: `Nano Banana API error: ${nanoBananaRes.status}`, details: errText }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const json = await nanoBananaRes.json();
  const imgPart = (json?.candidates?.[0]?.content?.parts ?? []).find(
    (p: any) => p.inlineData?.data,
  );

  if (!imgPart) {
    return new Response(
      JSON.stringify({ error: 'No image in Nano Banana response', raw: json }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({
      image: imgPart.inlineData.data,
      mimeType: imgPart.inlineData.mimeType || 'image/png',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ──────────────────────────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!VERTEX_SA_JSON) {
      return new Response(JSON.stringify({ error: 'VERTEX_SA_JSON not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, referenceUrl, referenceUrl2, logo, brandColors, description } = await req.json();
    const accessToken = await getAccessToken();

    // Route: reference image → Nano Banana (editing), otherwise → Imagen 3 (generation)
    if (hasReferenceImage(referenceUrl)) {
      return await callNanoBanana(accessToken, prompt, referenceUrl, referenceUrl2, logo, brandColors, description);
    } else {
      return await callImagen(accessToken, prompt, brandColors, description);
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
