import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.2.0';

// Vertex AI config
const VERTEX_SA_JSON = Deno.env.get('VERTEX_SA_JSON') || '';
const PROJECT_ID = 'nth-rookery-476315-e5';
const REGION = 'us-central1';
const VEO_MODEL = 'veo-2.0-generate-001';
const VEO_HOST = `${REGION}-aiplatform.googleapis.com`;
const VEO_ENDPOINT = `https://${VEO_HOST}/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${VEO_MODEL}:predictLongRunning`;

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

/**
 * Resolve an image source to { b64, mime }.
 * Accepts either a data URL (data:image/...;base64,...) or an HTTPS URL.
 * HTTPS URLs (e.g. Supabase Storage public URLs) are fetched server-side
 * and converted to base64 so VEO always receives bytesBase64Encoded.
 */
async function resolveImage(src: string): Promise<{ b64: string; mime: string }> {
  if (src.startsWith('data:')) {
    return {
      b64: stripDataPrefix(src),
      mime: getMimeFromDataUrl(src),
    };
  }
  // Fetch remote URL
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status}): ${src}`);
  const buffer = await res.arrayBuffer();
  const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  // Chunked encoding — spreading a large Uint8Array in one call overflows the stack
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const b64 = btoa(binary);
  return { b64, mime };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!VERTEX_SA_JSON) {
      return new Response(JSON.stringify({ error: 'VERTEX_SA_JSON not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    const accessToken = await getAccessToken();

    // ---- START ----
    if (action === 'start') {
      const { firstFrame, lastFrame, prompt } = body;

      if (!firstFrame) {
        return new Response(JSON.stringify({ error: 'firstFrame is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const firstResolved = await resolveImage(firstFrame);
      const instance: any = {
        prompt: prompt || 'Gentle cinematic motion',
        image: {
          bytesBase64Encoded: firstResolved.b64,
          mimeType: firstResolved.mime,
        },
      };

      // Hardcoded: 9:16 for mobile, 8s max duration
      const parameters: any = {
        aspectRatio: '9:16',
        durationSeconds: 8,
      };

      if (lastFrame) {
        const lastResolved = await resolveImage(lastFrame);
        parameters.lastFrame = {
          bytesBase64Encoded: lastResolved.b64,
          mimeType: lastResolved.mime,
        };
      }

      const veoRes = await fetch(VEO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ instances: [instance], parameters }),
      });

      if (!veoRes.ok) {
        const errText = await veoRes.text();
        // Return 200 so the Supabase client forwards the body; the caller checks data.error
        return new Response(JSON.stringify({ error: `VEO API error ${veoRes.status}`, details: errText }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const veoData = await veoRes.json();
      const operationName = veoData.name;

      if (!operationName) {
        return new Response(JSON.stringify({ error: 'No operation name returned', raw: veoData }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ operationName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- POLL ----
    if (action === 'poll') {
      const { operationName } = body;
      if (!operationName) {
        return new Response(JSON.stringify({ error: 'operationName is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use fetchPredictOperation endpoint (POST with operationName in body)
      const FETCH_OP_ENDPOINT = `https://${VEO_HOST}/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${VEO_MODEL}:fetchPredictOperation`;

      const pollRes = await fetch(FETCH_OP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ operationName }),
      });

      if (!pollRes.ok) {
        const errText = await pollRes.text();
        return new Response(JSON.stringify({ error: `Poll error ${pollRes.status}`, details: errText }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pollData = await pollRes.json();

      // Check for operation-level error (e.g. unsupported duration, content policy)
      if (pollData.done && pollData.error) {
        return new Response(
          JSON.stringify({ done: true, videoUrl: null, error: pollData.error.message || 'Generation failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (pollData.done) {
        // VEO 3.1 returns videos in response.videos[] (not generatedSamples)
        const videos = pollData.response?.videos || [];
        const samples =
          pollData.response?.generateVideoResponse?.generatedSamples ||
          pollData.response?.generatedSamples ||
          [];

        // Try videos[] first (VEO 3.1 format), fall back to samples[] (older format)
        const videoB64 = videos[0]?.bytesBase64Encoded || samples[0]?.video?.bytesBase64Encoded;
        const videoUri = videos[0]?.uri || samples[0]?.video?.uri;

        // If we got base64 video, return it as a data URL
        if (videoB64) {
          const videoDataUrl = `data:video/mp4;base64,${videoB64}`;
          return new Response(
            JSON.stringify({ done: true, videoUrl: videoDataUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If we got a URI, return it directly
        if (videoUri) {
          return new Response(
            JSON.stringify({ done: true, videoUrl: videoUri }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ done: true, videoUrl: null, raw: pollData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Still processing
      const metadata = pollData.metadata || {};
      const progress = metadata.percentComplete || 0;

      return new Response(
        JSON.stringify({ done: false, progress }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "start" or "poll".' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Return 200 so the Supabase client forwards the body and the caller sees the real error
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
