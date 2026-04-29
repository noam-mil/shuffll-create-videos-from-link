import { useState, useCallback, useRef } from 'react';

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

export interface VideoState {
  status: 'idle' | 'starting' | 'polling' | 'done' | 'error';
  videoUrl: string | null;
  error: string | null;
  progress: number;
}

export interface StartVideoParams {
  firstFrameSrc?: string | null;
  lastFrameSrc?: string | null;
  prompt: string;
}

const IDLE_STATE: VideoState = { status: 'idle', videoUrl: null, error: null, progress: 0 };

export function useVideoStates(
  entryCount: number,
  onVideoStarted: (index: number) => void,
  onVideoComplete: (index: number, videoUrl: string) => void,
  onVideoError: (index: number) => void,
) {
  const [states, setStates] = useState<VideoState[]>(() =>
    Array.from({ length: entryCount }, () => ({ ...IDLE_STATE }))
  );

  // Keep the array size in sync if entryCount changes
  if (states.length !== entryCount) {
    setStates(Array.from({ length: entryCount }, (_, i) => states[i] ?? { ...IDLE_STATE }));
  }

  // Per-index cancellation tokens
  const cancelTokens = useRef(new Map<number, { cancelled: boolean }>());

  const setIndexState = useCallback((index: number, update: Partial<VideoState> | ((prev: VideoState) => Partial<VideoState>)) => {
    setStates(prev => {
      const next = [...prev];
      const current = next[index] ?? { ...IDLE_STATE };
      const patch = typeof update === 'function' ? update(current) : update;
      next[index] = { ...current, ...patch };
      return next;
    });
  }, []);

  const generate = useCallback(async (index: number, params: StartVideoParams) => {
    // Cancel any existing run for this index
    const existing = cancelTokens.current.get(index);
    if (existing) existing.cancelled = true;

    const token = { cancelled: false };
    cancelTokens.current.set(index, token);

    setIndexState(index, { status: 'starting', videoUrl: null, error: null, progress: 0 });
    onVideoStarted(index);

    try {
      const startRes = await invokeVeoProxy({
        action: 'start',
        firstFrame: params.firstFrameSrc,
        lastFrame: params.lastFrameSrc,
        prompt: params.prompt,
      });

      if (token.cancelled) return;
      if (startRes.error) throw new Error(startRes.error);
      if (startRes.data?.error) throw new Error(`${startRes.data.error}: ${startRes.data.details ?? ''}`);
      const operationName = startRes.data?.operationName;
      if (!operationName) throw new Error('No operation name returned');

      setIndexState(index, { status: 'polling', progress: 5 });

      const maxPolls = 60;
      for (let attempt = 0; attempt < maxPolls; attempt++) {
        if (token.cancelled) return;
        await new Promise(r => setTimeout(r, 5000));
        if (token.cancelled) return;

        setIndexState(index, { progress: Math.min(95, 5 + (attempt / maxPolls) * 90) });

        const pollRes = await invokeVeoProxy({ action: 'poll', operationName });
        if (token.cancelled) return;
        if (pollRes.error) continue;

        const pollData = pollRes.data;
        if (pollData?.error) {
          const msg = typeof pollData.error === 'string' ? pollData.error : (pollData.error.message || 'Generation failed');
          throw new Error(msg);
        }

        if (pollData?.done) {
          const videoUrl = pollData.videoUrl;
          if (!videoUrl) throw new Error('No video URL returned');
          setIndexState(index, { status: 'done', videoUrl, error: null, progress: 100 });
          onVideoComplete(index, videoUrl);
          return;
        }
      }

      throw new Error('Video generation timed out after 5 minutes');
    } catch (err) {
      if (token.cancelled) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      setIndexState(index, { status: 'error', videoUrl: null, error: message, progress: 0 });
      onVideoError(index);
    }
  }, [onVideoStarted, onVideoComplete, onVideoError, setIndexState]);

  const cancel = useCallback((index: number) => {
    const token = cancelTokens.current.get(index);
    if (token) token.cancelled = true;
    setIndexState(index, { status: 'idle', error: null, progress: 0 });
  }, [setIndexState]);

  const reset = useCallback((index: number) => {
    setIndexState(index, { ...IDLE_STATE });
  }, [setIndexState]);

  const generateAll = useCallback(async (buildParams: (i: number) => StartVideoParams) => {
    const indices = Array.from({ length: states.length }, (_, i) => i)
      .filter(i => states[i]?.status === 'idle' || states[i]?.status === 'error');
    await Promise.allSettled(indices.map(i => generate(i, buildParams(i))));
  }, [states, generate]);

  return { states, generate, cancel, reset, generateAll };
}
