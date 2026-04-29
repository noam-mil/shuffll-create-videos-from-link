import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Copy, Download, RotateCcw, CheckCircle, XCircle, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
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

// ── Shared helpers ──────────────────────────────────────────────────────────

async function fetchMp4FromSheet(rowIndex: number): Promise<string | null> {
  const range = encodeURIComponent(`A${rowIndex}:AA${rowIndex}`);
  const res   = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`
  );
  const data  = await res.json() as { values?: string[][] };
  const row   = data.values?.[0] ?? [];
  return row[MP4_COL_INDEX] || null;
}

async function submitUrl(url: string): Promise<number> {
  const res  = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json() as { rowIndex?: number; error?: string };
  if (data.error || !data.rowIndex) throw new Error(data.error ?? 'No rowIndex returned');
  return data.rowIndex;
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
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <img src={shuffllLogo} alt="Shuffll" className="h-7 w-auto" />
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
        const videoUrl = await fetchMp4FromSheet(rowIndex);
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

interface ExcelJob {
  id: string;
  url: string;
  label: string;
  status: 'submitting' | 'polling' | 'done' | 'error';
  rowIndex?: number;
  videoUrl?: string;
  error?: string;
  startedAt: number;
}

function ExcelModeView({ excelUrl }: { excelUrl: string }) {
  const { t } = useTranslation();
  const [parseError, setParseError]   = useState<string | null>(null);
  const [jobs, setJobs]               = useState<ExcelJob[]>([]);
  const [started, setStarted]         = useState(false);
  const jobsRef                       = useRef<ExcelJob[]>([]);
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateJob = (id: string, patch: Partial<ExcelJob>) => {
    setJobs(prev => {
      const next = prev.map(j => j.id === id ? { ...j, ...patch } : j);
      jobsRef.current = next;
      return next;
    });
  };

  // Load rows on mount — Google Sheets URL → Sheets API, otherwise xlsx download
  useEffect(() => {
    (async () => {
      try {
        let rows: Record<string, string>[];

        const sheetId = extractSheetId(excelUrl);
        if (sheetId) {
          rows = await fetchRowsFromGoogleSheet(sheetId);
        } else {
          const res = await fetch(excelUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          const wb  = XLSX.read(buf, { type: 'array' });
          const ws  = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
          void ws; // suppress unused warning
        }

        if (rows.length === 0) { setParseError('Sheet/file is empty'); return; }

        const headers = Object.keys(rows[0]);
        let urlCol = headers.find(h => h.toLowerCase().includes('url'));
        if (!urlCol) {
          urlCol = headers.find(h => rows.some(r => String(r[h]).trim().startsWith('http')));
        }
        if (!urlCol) { setParseError('Could not find a URL column'); return; }

        const labelCol = headers.find(h => h !== urlCol && (
          h.toLowerCase().includes('name') ||
          h.toLowerCase().includes('address') ||
          h.toLowerCase().includes('title')
        ));

        const parsed: ExcelJob[] = rows
          .map((row, i) => ({
            id: String(i),
            url: String(row[urlCol!]).trim(),
            label: labelCol ? String(row[labelCol]).trim() : `Row ${i + 1}`,
            status: 'submitting' as const,
            startedAt: Date.now(),
          }))
          .filter(j => j.url.startsWith('http'));

        if (parsed.length === 0) { setParseError('No valid URLs found'); return; }

        jobsRef.current = parsed;
        setJobs(parsed);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Failed to load data');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Submit all jobs once parsed
  useEffect(() => {
    if (jobs.length === 0 || started) return;
    setStarted(true);

    jobs.forEach(job => {
      submitUrl(job.url)
        .then(rowIndex => updateJob(job.id, { status: 'polling', rowIndex }))
        .catch(err => updateJob(job.id, { status: 'error', error: err instanceof Error ? err.message : 'Submit failed' }));
    });
  }, [jobs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Single polling interval for all polling jobs
  useEffect(() => {
    if (jobs.length === 0) return;

    const tick = async () => {
      const polling = jobsRef.current.filter(j => j.status === 'polling' && j.rowIndex != null);
      if (polling.length === 0) return;

      await Promise.all(polling.map(async job => {
        if (Date.now() - job.startedAt > POLL_TIMEOUT) {
          updateJob(job.id, { status: 'error', error: t('videoGen.errorTimeout') });
          return;
        }
        try {
          const videoUrl = await fetchMp4FromSheet(job.rowIndex!);
          if (videoUrl) updateJob(job.id, { status: 'done', videoUrl });
        } catch { /* keep polling */ }
      }));
    };

    pollRef.current = setInterval(tick, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const done      = jobs.filter(j => j.status === 'done').length;
  const errors    = jobs.filter(j => j.status === 'error').length;
  const inProgress = jobs.filter(j => j.status === 'submitting' || j.status === 'polling').length;
  const progress  = jobs.length > 0 ? Math.round(((done + errors) / jobs.length) * 100) : 0;
  const allDone   = jobs.length > 0 && inProgress === 0;

  if (parseError) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#181818', border: '1px solid rgba(239,68,68,0.4)' }}
      >
        <p className="text-red-400 text-sm">{parseError}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400 mr-2" />
        <span className="text-gray-400 text-sm">Loading Excel file…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold text-sm">
            {allDone ? 'All done' : `Processing ${jobs.length} properties…`}
          </span>
          <span className="text-xs text-gray-400">{done}/{jobs.length} ready</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#2a2a2a' }}>
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)' }}
          />
        </div>

        {errors > 0 && (
          <p className="text-red-400 text-xs">{errors} row{errors > 1 ? 's' : ''} failed</p>
        )}
      </div>

      {/* Per-row list */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {jobs.map(job => (
          <div
            key={job.id}
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: '#181818', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Status icon */}
            <div className="flex-shrink-0">
              {job.status === 'done'       && <CheckCircle className="w-4 h-4 text-green-400" />}
              {job.status === 'error'      && <XCircle     className="w-4 h-4 text-red-400"   />}
              {job.status === 'submitting' && <Loader2     className="w-4 h-4 animate-spin text-purple-400" />}
              {job.status === 'polling'    && <Clock       className="w-4 h-4 text-yellow-400" />}
            </div>

            {/* Label + URL */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{job.label}</p>
              <p className="text-gray-500 text-xs truncate">{job.url}</p>
              {job.error && <p className="text-red-400 text-xs">{job.error}</p>}
            </div>

            {/* Actions when done */}
            {job.status === 'done' && job.videoUrl && (
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => { navigator.clipboard.writeText(job.videoUrl!); toast.success('Copied!'); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                  style={{ backgroundColor: '#2a2a2a' }}
                  title="Copy link"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <a
                  href={job.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                  style={{ backgroundColor: '#2a2a2a' }}
                  title="Open video"
                >
                  <Download className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
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
    </PageShell>
  );
};

export default VideoGenerator;
