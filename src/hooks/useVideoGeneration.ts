import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function invokeVeoProxy(body: object): Promise<{ data: any; error: string | null }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/veo-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) return { data: null, error: `HTTP ${res.status}: ${json?.message ?? JSON.stringify(json)}` };
  return { data: json, error: null };
}

interface VideoGenerationState {
  status: 'idle' | 'starting' | 'polling' | 'done' | 'error';
  videoUrl: string | null;
  error: string | null;
  progress: number; // 0-100
}

interface StartVideoParams {
  firstFrameSrc?: string | null;
  lastFrameSrc?: string | null;
  prompt: string;
}

export function useVideoGeneration() {
  const [state, setState] = useState<VideoGenerationState>({
    status: 'idle',
    videoUrl: null,
    error: null,
    progress: 0,
  });
  const abortRef = useRef(false);

  const generate = useCallback(async (params: StartVideoParams) => {
    abortRef.current = false;
    setState({ status: 'starting', videoUrl: null, error: null, progress: 0 });

    try {
      // Start generation
      const startRes = await invokeVeoProxy({
        action: 'start',
        firstFrame: params.firstFrameSrc,
        lastFrame: params.lastFrameSrc,
        prompt: params.prompt,
      });

      if (startRes.error) throw new Error(startRes.error);
      if (startRes.data?.error) throw new Error(`${startRes.data.error}: ${startRes.data.details ?? ''}`);
      const operationName = startRes.data?.operationName;
      if (!operationName) throw new Error('No operation name returned');

      // Poll for completion
      setState(s => ({ ...s, status: 'polling', progress: 5 }));
      const maxPolls = 60;

      for (let attempt = 0; attempt < maxPolls; attempt++) {
        if (abortRef.current) throw new Error('Cancelled');

        await new Promise(r => setTimeout(r, 5000));
        setState(s => ({ ...s, progress: Math.min(95, 5 + (attempt / maxPolls) * 90) }));

        const pollRes = await invokeVeoProxy({ action: 'poll', operationName });

        if (pollRes.error) continue;
        const pollData = pollRes.data;

        if (pollData?.error) {
          const msg = typeof pollData.error === 'string' ? pollData.error : (pollData.error.message || 'Generation failed');
          throw new Error(msg);
        }

        if (pollData?.done) {
          const videoUrl = pollData.videoUrl;
          if (!videoUrl) throw new Error('No video URL returned');
          setState({ status: 'done', videoUrl, error: null, progress: 100 });
          return videoUrl;
        }
      }

      throw new Error('Video generation timed out after 5 minutes');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ status: 'error', videoUrl: null, error: message, progress: 0 });
      throw err;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', videoUrl: null, error: null, progress: 0 });
  }, []);

  return { ...state, generate, cancel, reset };
}
