import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Copy, Download, RotateCcw } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import shuffllLogo from '@/assets/shuffll-logo.svg';

const SCRIPT_URL    = 'REPLACE_WITH_APPS_SCRIPT_WEB_APP_URL';
const SHEET_ID      = '1QO81dUtX_eHwpqawLCK57xqpuTOOmBGrG71D7fvUu4A';
const API_KEY       = 'AIzaSyAQEL3RhP6ugU1Lnav-Aoj4EXsRU8wdKAU';
const MP4_COL_INDEX = 26;
const POLL_INTERVAL = 3000;
const POLL_TIMEOUT  = 120_000;

type PageState =
  | { status: 'idle' }
  | { status: 'loading'; url: string; rowIndex: number }
  | { status: 'result';  url: string; videoUrl: string }
  | { status: 'error';   url: string; message: string };

async function fetchMp4FromSheet(rowIndex: number): Promise<string | null> {
  const range = encodeURIComponent(`A${rowIndex}:AA${rowIndex}`);
  const res   = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`
  );
  const data  = await res.json() as { values?: string[][] };
  const row   = data.values?.[0] ?? [];
  return row[MP4_COL_INDEX] || null;
}

function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const isCf = videoUrl.includes('cloudflarestream.com');
  if (isCf) {
    const src = videoUrl.includes('?') ? `${videoUrl}&autoplay=1` : `${videoUrl}?autoplay=1`;
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={src}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <video
      src={videoUrl}
      controls
      autoPlay
      playsInline
      className="w-full aspect-video rounded-xl bg-black object-contain"
    />
  );
}

const gradStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const btnGradStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)',
};

const badgeGradStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F97316 100%)',
};

const VideoGenerator = () => {
  const { t, i18n } = useTranslation();
  const isRtl = ['he', 'ar'].includes(i18n.language);

  const [inputUrl, setInputUrl] = useState('');
  const [state, setState] = useState<PageState>({ status: 'idle' });

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const isLoading = state.status === 'loading';
  const isResult  = state.status === 'result';
  const isError   = state.status === 'error';
  const isValidUrl = inputUrl.trim().startsWith('http');

  useEffect(() => {
    if (state.status !== 'loading') return;
    const { url, rowIndex } = state;

    const stopPolling = () => {
      if (pollRef.current)    clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      pollRef.current    = null;
      timeoutRef.current = null;
    };

    const checkSheet = async () => {
      try {
        const videoUrl = await fetchMp4FromSheet(rowIndex);
        if (videoUrl) {
          stopPolling();
          setState({ status: 'result', url, videoUrl });
        }
      } catch {
        // keep polling
      }
    };

    pollRef.current    = setInterval(checkSheet, POLL_INTERVAL);
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setState({ status: 'error', url, message: t('videoGen.errorTimeout') });
    }, POLL_TIMEOUT);

    return stopPolling;
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!isValidUrl || isLoading) return;
    const url = inputUrl.trim();
    try {
      const res  = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json() as { rowIndex?: number; error?: string };
      if (data.error || !data.rowIndex) {
        setState({ status: 'error', url, message: data.error ?? t('videoGen.errorTitle') });
        return;
      }
      setState({ status: 'loading', url, rowIndex: data.rowIndex });
    } catch {
      setState({ status: 'error', url, message: t('videoGen.errorTitle') });
    }
  };

  const handleReset = () => {
    setInputUrl('');
    setState({ status: 'idle' });
  };

  const handleCopy = async () => {
    if (state.status !== 'result') return;
    await navigator.clipboard.writeText(state.videoUrl);
    toast.success(t('videoGen.copiedLink'));
  };

  const handleDownload = () => {
    if (state.status !== 'result') return;
    const a = document.createElement('a');
    a.href = state.videoUrl;
    a.download = 'shuffll-video.mp4';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: '#080808',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(139,92,246,0.15) 0%, rgba(236,72,153,0.05) 50%, transparent 70%)',
      }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <img src={shuffllLogo} alt="Shuffll" className="h-7 w-auto" />
        <LanguageSwitcher />
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-6">

          {/* Hero */}
          <div className="text-center space-y-3 mb-8">
            <span
              className="inline-block text-xs font-700 px-3 py-1 rounded-full text-white mb-2"
              style={{ ...badgeGradStyle, fontWeight: 700 }}
            >
              {t('videoGen.badge')}
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              {t('videoGen.titleLine1')}{' '}
              <span style={gradStyle}>{t('videoGen.titleGrad')}</span>{' '}
              {t('videoGen.titleLine2')}
            </h1>
            <p className="text-gray-400 text-base font-medium max-w-md mx-auto">
              {t('videoGen.subtitle')}
            </p>
          </div>

          {/* Step 1 card — collapsed when result */}
          {isResult ? (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={badgeGradStyle}
              >
                <svg viewBox="0 0 12 12" className="w-3 h-3 text-white fill-current"><path d="M2 6l3 3 5-5"/></svg>
              </div>
              <span className="text-gray-400 text-sm truncate flex-1">{(state as { url: string }).url}</span>
              <button onClick={handleReset} className="text-gray-500 hover:text-white transition-colors ml-2">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className={cn(
                'rounded-2xl p-5 space-y-4 transition-all',
                isLoading && 'opacity-60'
              )}
              style={{
                backgroundColor: '#181818',
                border: isLoading ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isLoading ? '0 0 20px rgba(139,92,246,0.15)' : 'none',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-md text-white"
                  style={badgeGradStyle}
                >
                  1
                </span>
                <span className="text-white font-semibold text-sm">{t('videoGen.step1Label')}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  placeholder={t('videoGen.placeholder')}
                  disabled={isLoading}
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed transition-all"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={!isValidUrl || isLoading}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 whitespace-nowrap"
                  style={btnGradStyle}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('videoGen.generating')}
                    </>
                  ) : (
                    t('videoGen.generateBtn')
                  )}
                </button>
              </div>

              {isError && (
                <p className="text-red-400 text-xs mt-1">{(state as { message: string }).message}</p>
              )}
            </div>
          )}

          {/* Step 2 card — visible when loading or result */}
          {(isLoading || isResult) && (
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                backgroundColor: '#181818',
                border: isResult
                  ? '1px solid rgba(139,92,246,0.5)'
                  : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isResult ? '0 0 30px rgba(139,92,246,0.2)' : 'none',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-md text-white"
                  style={badgeGradStyle}
                >
                  2
                </span>
                <span className="text-white font-semibold text-sm">{t('videoGen.step2Label')}</span>
                {isResult && (
                  <span className="ml-auto text-xs font-semibold" style={gradStyle}>
                    {t('videoGen.ready')}
                  </span>
                )}
              </div>

              {isLoading && (
                <div className="space-y-3">
                  {/* Shimmer placeholder */}
                  <div
                    className="w-full aspect-video rounded-xl"
                    style={{
                      background: 'linear-gradient(90deg, #222 0%, #333 50%, #222 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s ease-in-out infinite',
                    }}
                  />
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    {t('videoGen.processing')}
                  </div>
                </div>
              )}

              {isResult && (
                <div className="space-y-4">
                  <VideoPlayer videoUrl={(state as { videoUrl: string }).videoUrl} />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <Copy className="w-4 h-4" />
                      {t('videoGen.copyLink')}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <Download className="w-4 h-4" />
                      {t('videoGen.download')}
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                      style={{
                        background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)',
                        color: 'white',
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t('videoGen.generateBtn')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default VideoGenerator;
