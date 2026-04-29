import { supabase } from '@/integrations/supabase/client';

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY as string;

// eleven_v3 requires ISO 639-2 three-letter codes; the app stores ISO 639-1 two-letter codes
const ELEVEN_V3_LANG: Record<string, string> = {
  he: 'heb',
  en: 'eng',
  ar: 'ara',
  es: 'spa',
  de: 'deu',
};

function detectLang(text: string, hint?: string): string {
  if (/[\u0590-\u05FF]/.test(text)) return 'heb';
  return ELEVEN_V3_LANG[hint ?? 'he'] ?? hint ?? 'heb';
}

async function callElevenLabs(text: string, voiceId: string, languageCode?: string): Promise<Response> {
  const body: Record<string, unknown> = {
    text,
    model_id: 'eleven_v3',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
  };
  if (languageCode) body.language_code = languageCode;
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function generateVoice(text: string, voiceId: string, languageCode?: string): Promise<ArrayBuffer> {
  const code = detectLang(text, languageCode);
  let res = await callElevenLabs(text, voiceId, code);
  // If the voice doesn't support the language code, retry without it (auto-detect)
  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes('unsupported_language')) {
      res = await callElevenLabs(text, voiceId);
    }
    if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${errText}`);
  }
  return res.arrayBuffer();
}

export async function uploadVoiceAudio(
  buffer: ArrayBuffer,
  productionId: string,
  sceneResultId: string,
): Promise<string> {
  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  const path = `productions/${productionId}/voice/${sceneResultId}.mp3`;
  const { data, error } = await supabase.storage
    .from('template-assets')
    .upload(path, blob, { contentType: 'audio/mpeg', upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('template-assets').getPublicUrl(data.path);
  return publicUrl;
}
