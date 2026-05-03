import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Copy, Download, RotateCcw } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import shuffllLogo from '@/assets/shuffll-logo.svg';
import { insertDuplicatedRow, fetchMp4FromSheetById, addEmailToRow } from '@/lib/googleSheets';

const SHEET_ID      = '1QO81dUtX_eHwpqawLCK57xqpuTOOmBGrG71D7fvUu4A';
const POLL_INTERVAL = 3000;
const POLL_TIMEOUT  = 120_000;

// ── Shared helpers ──────────────────────────────────────────────────────────


async function submitUrl(url: string): Promise<number> {
  return insertDuplicatedRow(SHEET_ID, url);
}

function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([^/?#]+)/);
  return m ? m[1] : null;
}

async function fetchRowsFromGoogleSheet(sheetId: string): Promise<Record<string, string>[]> {
  const res  = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ1000?key=${API_KEY}`
  );
  if (!res.ok) throw new Error(`Sheets API HTTP ${res.status}`);
  const data = await res.json() as { values?: string[][] };
  const raw  = data.values ?? [];
  if (raw.length < 2) return [];
  const headers = raw[0];
  return raw.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}

// ── Shared style constants ──────────────────────────────────────────────────

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

// ── VideoPlayer ─────────────────────────────────────────────────────────────

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

// ── Shell layout ────────────────────────────────────────────────────────────

function PageShell({ isRtl, children }: { isRtl: boolean; children: React.ReactNode }) {
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
      <nav className="flex items-center justify-end px-6 py-4 max-w-3xl mx-auto w-full">
        <LanguageSwitcher />
      </nav>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function Hero() {
  const { t } = useTranslation();
  return (
    <div className="text-center space-y-3 mb-8">
      <img src={shuffllLogo} alt="Shuffll" className="h-8 w-auto mx-auto mb-3" />
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
  );
}

// ── SingleModeView ───────────────────────────────────────────────────────────

type SingleState =
  | { status: 'idle' }
  | { status: 'loading'; url: string; rowIndex: number }
  | { status: 'result';  url: string; videoUrl: string }
  | { status: 'error';   url: string; message: string };

function SingleModeView() {
  const { t } = useTranslation();
  const [inputUrl, setInputUrl] = useState('');
  const [state, setState] = useState<SingleState>({ status: 'idle' });

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const isLoading  = state.status === 'loading';
  const isResult   = state.status === 'result';
  const isError    = state.status === 'error';
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
        const videoUrl = await fetchMp4FromSheetById(SHEET_ID, rowIndex);
        if (videoUrl) {
          stopPolling();
          setState({ status: 'result', url, videoUrl });
        }
      } catch { /* keep polling */ }
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
      const rowIndex = await submitUrl(url);
      setState({ status: 'loading', url, rowIndex });
    } catch {
      setState({ status: 'error', url, message: t('videoGen.errorTitle') });
    }
  };

  const handleReset = () => { setInputUrl(''); setState({ status: 'idle' }); };

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
    <>
      {/* Step 1 card */}
      {isResult ? (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={badgeGradStyle}>
            <svg viewBox="0 0 12 12" className="w-3 h-3 text-white fill-current"><path d="M2 6l3 3 5-5"/></svg>
          </div>
          <span className="text-gray-400 text-sm truncate flex-1">{(state as { url: string }).url}</span>
          <button onClick={handleReset} className="text-gray-500 hover:text-white transition-colors ml-2">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className={cn('rounded-2xl p-5 space-y-4 transition-all', isLoading && 'opacity-60')}
          style={{
            backgroundColor: '#181818',
            border: isLoading ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
            boxShadow: isLoading ? '0 0 20px rgba(139,92,246,0.15)' : 'none',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md text-white" style={badgeGradStyle}>1</span>
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
              style={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            <button
              onClick={handleGenerate}
              disabled={!isValidUrl || isLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 whitespace-nowrap"
              style={btnGradStyle}
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('videoGen.generating')}</> : t('videoGen.generateBtn')}
            </button>
          </div>
          {isError && <p className="text-red-400 text-xs mt-1">{(state as { message: string }).message}</p>}
        </div>
      )}

      {/* Step 2 card */}
      {(isLoading || isResult) && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            backgroundColor: '#181818',
            border: isResult ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.07)',
            boxShadow: isResult ? '0 0 30px rgba(139,92,246,0.2)' : 'none',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md text-white" style={badgeGradStyle}>2</span>
            <span className="text-white font-semibold text-sm">{t('videoGen.step2Label')}</span>
            {isResult && <span className="ml-auto text-xs font-semibold" style={gradStyle}>{t('videoGen.ready')}</span>}
          </div>

          {isLoading && (
            <div className="space-y-3">
              <div
                className="w-full aspect-video rounded-xl"
                style={{ background: 'linear-gradient(90deg, #222 0%, #333 50%, #222 100%)', backgroundSize: '200% 100%', animation: 'shimmer 2s ease-in-out infinite' }}
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
                  <Copy className="w-4 h-4" />{t('videoGen.copyLink')}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Download className="w-4 h-4" />{t('videoGen.download')}
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)', color: 'white' }}
                >
                  <RotateCcw className="w-4 h-4" />{t('videoGen.generateBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── ExcelModeView ────────────────────────────────────────────────────────────

type ExcelGenState =
  | { status: 'idle' }
  | { status: 'loading'; rowIndex: number }
  | { status: 'result';  videoUrl: string }
  | { status: 'error';   message: string };

function ExcelModeView({ excelUrl }: { excelUrl: string }) {
  const { t } = useTranslation();
  const sheetId = extractSheetId(excelUrl) ?? '';
  const [newLink,   setNewLink]   = useState('');
  const [emailInput,    setEmailInput]    = useState('');
  const [emails,        setEmails]        = useState<string[]>([]);
  const [emailSent,     setEmailSent]     = useState(false);
  const [genState,      setGenState]      = useState<ExcelGenState>({ status: 'idle' });
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const isLoading  = genState.status === 'loading';
  const isResult   = genState.status === 'result';
  const isError    = genState.status === 'error';
  const isValidUrl = newLink.trim().startsWith('http');

  useEffect(() => {
    if (genState.status !== 'loading') return;
    const { rowIndex } = genState;

    const stopPolling = () => {
      if (pollRef.current)    clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const check = async () => {
      try {
        const videoUrl = await fetchMp4FromSheetById(sheetId, rowIndex);
        if (videoUrl) { stopPolling(); setGenState({ status: 'result', videoUrl }); }
      } catch { /* keep polling */ }
    };

    // Poll once a minute; no hard timeout — video generation can take many minutes
    check(); // check immediately on submit too
    pollRef.current = setInterval(check, 20_000);

    return stopPolling;
  }, [genState.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!isValidUrl || isLoading) return;
    const url = newLink.trim();
    try {
      const rowIndex = await insertDuplicatedRow(sheetId, url);
      // Trigger n8n workflow — fire and forget, no-cors so browser doesn't block it
      fetch('https://n8n.shuffll.cloud/webhook/82192db3-7c08-4e86-8f49-d57e0302d393', {
        method: 'POST',
        mode: 'no-cors',
      }).catch(err => console.warn('n8n webhook failed:', err));
      setGenState({ status: 'loading', rowIndex });
    } catch (e) {
      console.error('insertDuplicatedRow failed:', e);
      setGenState({ status: 'error', message: e instanceof Error ? e.message : t('videoGen.errorTitle') });
    }
  };

  const handleAddEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e.includes('@') || emails.includes(e)) return;
    setEmails(prev => [...prev, e]);
    setEmailInput('');
  };

  const handleRemoveEmail = (e: string) => setEmails(prev => prev.filter(x => x !== e));

  const handleNotify = async () => {
    if (emails.length === 0 || genState.status !== 'loading') return;
    try {
      await addEmailToRow(sheetId, genState.rowIndex, emails);
      setEmailSent(true);
      toast.success('Done! We\'ll email you when your video is ready.');
    } catch {
      toast.error('Failed to save emails, please try again.');
    }
  };

  const handleReset = () => { setNewLink(''); setEmailInput(''); setEmails([]); setEmailSent(false); setGenState({ status: 'idle' }); };

  const handleCopy = async () => {
    if (genState.status !== 'result') return;
    await navigator.clipboard.writeText(genState.videoUrl);
    toast.success(t('videoGen.copiedLink'));
  };

  return (
    <div className="space-y-4">
      {/* Input card — collapses when result */}
      {isResult ? (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={badgeGradStyle}>
            <svg viewBox="0 0 12 12" className="w-3 h-3 text-white fill-current"><path d="M2 6l3 3 5-5"/></svg>
          </div>
          <span className="text-gray-400 text-sm truncate flex-1">{newLink}</span>
          <button onClick={handleReset} className="text-gray-500 hover:text-white transition-colors ml-2">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className={cn('rounded-2xl p-5 space-y-3 transition-all', isLoading && 'opacity-60')}
          style={{
            backgroundColor: '#181818',
            border: isLoading ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
            boxShadow: isLoading ? '0 0 20px rgba(139,92,246,0.15)' : 'none',
          }}
        >
          <span className="text-white font-semibold text-sm">Paste a property link</span>
          <div className="flex gap-2">
            <input
              type="url"
              value={newLink}
              onChange={e => setNewLink(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="https://..."
              disabled={isLoading}
              className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            <button
              onClick={handleGenerate}
              disabled={!isValidUrl || isLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 whitespace-nowrap"
              style={btnGradStyle}
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('videoGen.generating')}</> : t('videoGen.generateBtn')}
            </button>
          </div>
          {isError && <p className="text-red-400 text-xs">{(genState as { message: string }).message}</p>}
        </div>
      )}

      {/* Video card */}
      {(isLoading || isResult) && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            backgroundColor: '#181818',
            border: isResult ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.07)',
            boxShadow: isResult ? '0 0 30px rgba(139,92,246,0.2)' : 'none',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md text-white" style={badgeGradStyle}>2</span>
            <span className="text-white font-semibold text-sm">{t('videoGen.step2Label')}</span>
            {isResult && <span className="ml-auto text-xs font-semibold" style={gradStyle}>{t('videoGen.ready')}</span>}
          </div>

          {isLoading && (
            <div className="space-y-3">
              {/* Shimmer panel with email content inside */}
              <div
                className="relative w-full rounded-xl overflow-hidden flex flex-col items-center justify-center gap-4 px-6 py-8"
                style={{ background: 'linear-gradient(90deg, #1a1a1a 0%, #222 50%, #1a1a1a 100%)', backgroundSize: '200% 100%', animation: 'shimmer 2s ease-in-out infinite', minHeight: '220px' }}
              >
                {/* Icon + heading */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={badgeGradStyle}>
                    <svg className="w-5 h-5 text-white fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75"/></svg>
                  </div>
                  <p className="text-white font-semibold text-sm">Get notified when it's ready</p>
                  <p className="text-gray-400 text-xs max-w-xs">Usually 5–10 minutes. Add emails and we'll send the link directly.</p>
                </div>

                {/* Email chips */}
                {emails.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {emails.map(e => (
                      <span
                        key={e}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)' }}
                      >
                        {e}
                        <button onClick={() => handleRemoveEmail(e)} className="text-purple-300 hover:text-white transition-colors leading-none">×</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Input row */}
                {!emailSent ? (
                  <div className="flex gap-2 w-full max-w-sm">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddEmail()}
                      placeholder="Add email address…"
                      className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    />
                    <button
                      onClick={handleAddEmail}
                      disabled={!emailInput.includes('@')}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90"
                      style={{ backgroundColor: 'rgba(139,92,246,0.35)', border: '1px solid rgba(139,92,246,0.5)' }}
                    >
                      + Add
                    </button>
                    <button
                      onClick={handleNotify}
                      disabled={emails.length === 0}
                      className="px-3 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 whitespace-nowrap"
                      style={btnGradStyle}
                    >
                      Notify
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-semibold" style={gradStyle}>
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                    We'll notify {emails.length === 1 ? emails[0] : `${emails.length} people`} when ready.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                {t('videoGen.processing')}
              </div>
            </div>
          )}

          {isResult && (
            <div className="space-y-4">
              <VideoPlayer videoUrl={(genState as { videoUrl: string }).videoUrl} />
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Copy className="w-4 h-4" />{t('videoGen.copyLink')}
                </button>
                <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)', color: 'white' }}>
                  <RotateCcw className="w-4 h-4" />{t('videoGen.generateBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root component ───────────────────────────────────────────────────────────

const VideoGenerator = () => {
  const { i18n } = useTranslation();
  const [searchParams]   = useSearchParams();
  const excelUrl         = searchParams.get('excelUrl');
  const isRtl            = ['he', 'ar'].includes(i18n.language);

  return (
    <PageShell isRtl={isRtl}>
      <Hero />
      {excelUrl ? <ExcelModeView excelUrl={excelUrl} /> : <SingleModeView />}
      <p className="text-center text-gray-600 text-xs mt-6">v1.0.8</p>
    </PageShell>
  );
};

export default VideoGenerator;
