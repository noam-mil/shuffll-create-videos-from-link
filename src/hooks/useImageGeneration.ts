import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BrandColors } from '@/types/template';
import { resolveColorPlaceholders } from '@/types/template';

interface GenerateImageParams {
  prompt: string;
  referenceUrl?: string | null;
  referenceUrl2?: string | null;
  logoData?: { data: string; mime: string } | null;
  logoUrl?: string | null;
  brandColors: BrandColors;
  description?: string | null;
}

export function useGenerateImage() {
  return useMutation({
    mutationFn: async (params: GenerateImageParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resolvedPrompt = resolveColorPlaceholders(params.prompt, params.brandColors);
      const resolvedDescription = params.description
        ? resolveColorPlaceholders(params.description, params.brandColors)
        : undefined;

      // Build logo payload: prefer base64, fall back to URL for edge function to fetch
      const logo = params.logoData
        ? { data: params.logoData.data, mime: params.logoData.mime }
        : params.logoUrl
          ? { url: params.logoUrl }
          : undefined;

      const response = await supabase.functions.invoke('gemini-proxy', {
        body: {
          prompt: resolvedPrompt,
          referenceUrl: params.referenceUrl,
          referenceUrl2: params.referenceUrl2,
          logo,
          brandColors: params.brandColors,
          description: resolvedDescription,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data as { image: string; mimeType: string };
    },
  });
}

/** Generate 4 images in parallel for a scene */
export async function generateSceneImages(
  params: GenerateImageParams,
  count: number = 4
): Promise<Array<{ image: string; mimeType: string } | { error: string }>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const resolvedPrompt = resolveColorPlaceholders(params.prompt, params.brandColors);
  const resolvedDescription = params.description
    ? resolveColorPlaceholders(params.description, params.brandColors)
    : undefined;

  // Build logo payload: prefer base64, fall back to URL for edge function to fetch
  const logo = params.logoData
    ? { data: params.logoData.data, mime: params.logoData.mime }
    : params.logoUrl
      ? { url: params.logoUrl }
      : undefined;

  const requests = Array.from({ length: count }, () =>
    supabase.functions.invoke('gemini-proxy', {
      body: {
        prompt: resolvedPrompt,
        referenceUrl: params.referenceUrl,
        referenceUrl2: params.referenceUrl2,
        logo,
        brandColors: params.brandColors,
        description: resolvedDescription,
      },
    }).then(res => {
      if (res.error) return { error: res.error.message };
      return res.data as { image: string; mimeType: string };
    }).catch(err => ({ error: err.message }))
  );

  return Promise.all(requests);
}

/** Upload a base64 image to Supabase Storage and return the public URL */
export async function uploadGeneratedImage(
  base64: string,
  mimeType: string,
  storagePath: string
): Promise<string> {
  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });

  const { data, error } = await supabase.storage
    .from('template-assets')
    .upload(storagePath, blob, { contentType: mimeType, upsert: true });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('template-assets')
    .getPublicUrl(data.path);

  return publicUrl;
}

/** Convert a File to base64 data + mime type */
export function fileToBase64(file: File): Promise<{ data: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const data = result.split(',')[1];
      resolve({ data, mime: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Extract dominant colors from an image data URL */
export function extractDominantColors(dataUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const SIZE = 80;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve([]); return; }
      ctx.drawImage(img, 0, 0, SIZE, SIZE);

      const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
      const freq: Record<string, number> = {};

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 128) continue;
        const brightness = (r + g + b) / 3;
        if (brightness > 238 || brightness < 18) continue;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max === 0 || (max - min) / max < 0.18) continue;

        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const key = `${qr}|${qg}|${qb}`;
        freq[key] = (freq[key] || 0) + 1;
      }

      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

      const toHex = (r: number, g: number, b: number) =>
        '#' + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('');

      const colorDist = (k1: string, k2: string) => {
        const [r1, g1, b1] = k1.split('|').map(Number);
        const [r2, g2, b2] = k2.split('|').map(Number);
        return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
      };

      const picks: string[] = [];
      for (const [key] of sorted) {
        if (picks.every(p => colorDist(key, p) > 80)) {
          picks.push(key);
          if (picks.length === 2) break;
        }
      }

      resolve(picks.map(k => {
        const [r, g, b] = k.split('|').map(Number);
        return toHex(r, g, b);
      }));
    };
    img.onerror = () => resolve([]);
    img.src = dataUrl;
  });
}
