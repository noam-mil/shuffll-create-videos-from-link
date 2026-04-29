# Video Generator Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone public page at `/video-generator` where a user pastes a property listing URL, clicks Generate, and receives a video by polling the Google Sheet (column AA = mp4 URL) every 3 seconds until the value appears.

**Architecture:** Single-file page component (`VideoGenerator.tsx`) driven by a 4-state discriminated union (`idle | loading | result | error`). On Generate: POST URL to Apps Script → get back `rowIndex` → poll Sheets API for column AA of that row → show video when found. Language switcher uses the existing `LanguageSwitcher` component (globe icon + dropdown). Shuffll logo uses `src/assets/shuffll-logo.svg`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (JIT arbitrary values), i18next (`useTranslation`), Sonner toasts, Lucide icons, Google Sheets API v4, existing `LanguageSwitcher` component.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Already done | `src/assets/shuffll-logo.svg` | Shuffll horizontal logo (light) |
| Modify | `index.html` | Add Plus Jakarta Sans Google Font |
| Modify | `src/index.css` | Add `@keyframes shimmer` |
| Modify | `src/i18n/locales/en.json` | Add `videoGen` translation keys |
| Modify | `src/i18n/locales/he.json` | Add `videoGen` translation keys |
| **Create** | `src/pages/VideoGenerator.tsx` | Full page component with polling |
| Modify | `src/App.tsx` | Register `/video-generator` public route |

---

## Task 1: Add Plus Jakarta Sans font

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add font preconnect + stylesheet inside `<head>` before `</head>`**

  In `index.html`, add these two lines right before `</head>`:

  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add Plus Jakarta Sans font for video generator"
  ```

---

## Task 2: Add shimmer animation

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append shimmer keyframe at the bottom of `src/index.css`**

  Add this at the very end of the file:

  ```css
  @keyframes shimmer {
    0%, 100% { background-position: 200% 0; }
    50%       { background-position: -200% 0; }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/index.css
  git commit -m "feat: add shimmer animation for video generator loading state"
  ```

---

## Task 3: Add i18n translation keys

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/he.json`

- [ ] **Step 1: Add `videoGen` block to `en.json`**

  Add this block as a top-level key (alongside `"common"`, `"auth"`, etc.):

  ```json
  "videoGen": {
    "badge": "AI-Powered",
    "titleLine1": "Property",
    "titleGrad": "Video",
    "titleLine2": "Generator",
    "subtitle": "Paste any listing URL and get a professional video in seconds",
    "step1Label": "Property URL",
    "placeholder": "https://www.yad2.co.il/item/...",
    "generateBtn": "Generate →",
    "generating": "Working…",
    "step2Label": "Your Video",
    "processing": "Analysing property data…",
    "videoPlaceholder": "Video will appear here",
    "copyLink": "Copy Link",
    "copiedLink": "Copied!",
    "download": "Download",
    "done": "Done",
    "ready": "Ready!",
    "errorTitle": "Generation failed",
    "errorTimeout": "Timed out waiting for video — please try again",
    "retry": "Try again"
  }
  ```

- [ ] **Step 2: Add `videoGen` block to `he.json`**

  Add this block as a top-level key in `he.json`:

  ```json
  "videoGen": {
    "badge": "מבוסס בינה מלאכותית",
    "titleLine1": "גנרטור",
    "titleGrad": "וידאו",
    "titleLine2": "לנכסים",
    "subtitle": "הדביקו קישור למודעה וקבלו סרטון מקצועי תוך שניות",
    "step1Label": "קישור לנכס",
    "placeholder": "https://www.yad2.co.il/item/...",
    "generateBtn": "→ צור סרטון",
    "generating": "עובד…",
    "step2Label": "הסרטון שלך",
    "processing": "מנתח את פרטי הנכס…",
    "videoPlaceholder": "הסרטון יופיע כאן",
    "copyLink": "העתק קישור",
    "copiedLink": "הועתק!",
    "download": "הורד",
    "done": "הושלם",
    "ready": "מוכן!",
    "errorTitle": "יצירה נכשלה",
    "errorTimeout": "פג הזמן — אנא נסה שוב",
    "retry": "נסה שוב"
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/i18n/locales/en.json src/i18n/locales/he.json
  git commit -m "feat: add videoGen i18n keys (EN + HE)"
  ```

---

## Task 4: Create VideoGenerator page

**Files:**
- Create: `src/pages/VideoGenerator.tsx`

### Architecture notes
- `handleGenerate` POSTs the URL to `SCRIPT_URL` and expects `{ rowIndex: number }` back
- On receiving `rowIndex`, sets state to `{ status: 'loading', url, rowIndex }` which triggers the polling `useEffect`
- The polling `useEffect` runs only while `state.status === 'loading'` — it starts an interval + a timeout, and cleans up both on status change or unmount
- `fetchMp4FromSheet(rowIndex)` fetches column A through AA of that row and returns `row[26]` (column AA, 0-based index 26)
- On video found: transitions to `result`. On timeout: transitions to `error`

- [ ] **Step 1: Create the file with this complete content**

  ```tsx
  import { useState, useEffect, useRef } from 'react';
  import { useTranslation } from 'react-i18next';
  import { Loader2, Link2, Copy, Download, RotateCcw, CheckCircle } from 'lucide-react';
  import { LanguageSwitcher } from '@/components/LanguageSwitcher';
  import { cn } from '@/lib/utils';
  import { toast } from 'sonner';
  import shuffllLogo from '@/assets/shuffll-logo.svg';

  // ── Constants ──────────────────────────────────────────────────────────────
  // Replace SCRIPT_URL with the deployed Google Apps Script web app URL.
  // The script must accept POST { url: string } and return { rowIndex: number }.
  const SCRIPT_URL      = 'REPLACE_WITH_APPS_SCRIPT_WEB_APP_URL';
  const SHEET_ID        = '1QO81dUtX_eHwpqawLCK57xqpuTOOmBGrG71D7fvUu4A';
  const API_KEY         = 'AIzaSyAQEL3RhP6ugU1Lnav-Aoj4EXsRU8wdKAU';
  const MP4_COL_INDEX   = 26;   // column AA (0-based)
  const POLL_INTERVAL   = 3000; // ms between sheet checks
  const POLL_TIMEOUT    = 120_000; // 2 minutes before giving up

  // ── Types ──────────────────────────────────────────────────────────────────
  type PageState =
    | { status: 'idle' }
    | { status: 'loading'; url: string; rowIndex: number }
    | { status: 'result';  url: string; videoUrl: string }
    | { status: 'error';   url: string; message: string };

  // ── Sheet polling helper ───────────────────────────────────────────────────
  async function fetchMp4FromSheet(rowIndex: number): Promise<string | null> {
    const range = encodeURIComponent(`A${rowIndex}:AA${rowIndex}`);
    const res   = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`,
    );
    const data  = await res.json() as { values?: string[][] };
    const row   = data.values?.[0] ?? [];
    return row[MP4_COL_INDEX] || null;
  }

  // ── Video player ───────────────────────────────────────────────────────────
  function VideoPlayer({ videoUrl }: { videoUrl: string }) {
    const isCf = videoUrl.includes('cloudflarestream.com');
    if (isCf) {
      const src = videoUrl.includes('?')
        ? `${videoUrl}&autoplay=1`
        : `${videoUrl}?autoplay=1`;
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

  // ── Shared gradient style ──────────────────────────────────────────────────
  const gradStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  // ── Main page ──────────────────────────────────────────────────────────────
  const VideoGenerator = () => {
    const { t, i18n } = useTranslation();
    const isRtl = ['he', 'ar'].includes(i18n.language);

    const [inputUrl, setInputUrl] = useState('');
    const [state, setState]       = useState<PageState>({ status: 'idle' });

    const pollRef    = useRef<ReturnType<typeof setInterval>  | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>   | null>(null);

    const isLoading = state.status === 'loading';
    const isResult  = state.status === 'result';
    const isError   = state.status === 'error';
    const isValidUrl = inputUrl.trim().startsWith('http');

    // ── Polling effect — runs only while loading ───────────────────────────
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
          // network hiccup — keep polling
        }
      };

      pollRef.current    = setInterval(checkSheet, POLL_INTERVAL);
      timeoutRef.current = setTimeout(() => {
        stopPolling();
        setState({ status: 'error', url, message: t('videoGen.errorTimeout') });
      }, POLL_TIMEOUT);

      return stopPolling; // cleanup on unmount or state change
    }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleGenerate = async () => {
      if (!isValidUrl || isLoading) return;
      const url = inputUrl.trim();
      // Optimistically show loading — we need rowIndex from the script first
      // Use a temp rowIndex of 0 to avoid a flash; the useEffect won't start
      // polling until we have the real rowIndex via setState below.
      try {
        const res  = await fetch(SCRIPT_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ url }),
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

    // ── Render ─────────────────────────────────────────────────────────────
    return (
      <div
        className="min-h-screen flex flex-col"
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          background: '#080808',
          backgroundImage: [
            'radial-gradient(ellipse 60% 40% at 20% 110%, rgba(109,40,217,0.18) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 30% at 80% 110%, rgba(236,72,153,0.12) 0%, transparent 70%)',
          ].join(','),
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* ── Nav ── */}
        <nav
          className="flex items-center justify-between px-6 py-3 border-b sticky top-0 z-10"
          style={{
            borderColor: 'rgba(255,255,255,0.07)',
            background:  'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <img src={shuffllLogo} alt="Shuffll" className="h-7 w-auto" />
          <LanguageSwitcher />
        </nav>

        {/* ── Main ── */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg flex flex-col gap-4">

            {/* Hero */}
            <div className="text-center mb-2">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold mb-4"
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#C4B5FD' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0"
                  style={{ boxShadow: '0 0 6px #8B5CF6' }}
                />
                {t('videoGen.badge')}
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight mb-3">
                {t('videoGen.titleLine1')}{' '}
                <span style={gradStyle}>{t('videoGen.titleGrad')}</span>
                <br />
                {t('videoGen.titleLine2')}
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {t('videoGen.subtitle')}
              </p>
            </div>

            {/* Gradient divider */}
            <div
              aria-hidden
              style={{
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), rgba(236,72,153,0.15), transparent)',
              }}
            />

            {/* ── Step 1 ── */}
            {isResult ? (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm flex-1 truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {state.url}
                </span>
                <span className="text-xs font-bold text-emerald-400 flex-shrink-0">
                  {t('videoGen.done')}
                </span>
              </div>
            ) : (
              <div
                className={cn('rounded-2xl p-5 flex flex-col gap-4 transition-opacity', isLoading && 'opacity-75')}
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(236,72,153,0.03) 100%)',
                  border: `1px solid ${isLoading ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.3)'}`,
                  boxShadow: isLoading ? 'none' : '0 0 0 1px rgba(139,92,246,0.1), 0 8px 32px rgba(139,92,246,0.08)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                    style={isLoading
                      ? { background: '#22C55E' }
                      : { background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)' }
                    }
                  >
                    {isLoading ? '✓' : '1'}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                    {t('videoGen.step1Label')}
                  </span>
                </div>

                <div className="flex gap-2">
                  <div
                    className="flex-1 flex items-center gap-2 rounded-lg px-3 h-10 min-w-0"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Link2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    {isLoading ? (
                      <span className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {state.url}
                      </span>
                    ) : (
                      <input
                        type="url"
                        value={inputUrl}
                        onChange={e => setInputUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && isValidUrl) handleGenerate(); }}
                        placeholder={t('videoGen.placeholder')}
                        className="flex-1 bg-transparent outline-none text-sm text-white min-w-0"
                        style={{ caretColor: '#8B5CF6' }}
                        disabled={isLoading}
                        dir="ltr"
                      />
                    )}
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={!isValidUrl || isLoading}
                    className="flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-bold text-white flex-shrink-0 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    style={isLoading
                      ? { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#C4B5FD' }
                      : { background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }
                    }
                  >
                    {isLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('videoGen.generating')}</>
                      : t('videoGen.generateBtn')
                    }
                  </button>
                </div>

                {isError && (
                  <p className="text-xs text-red-400">{state.message}</p>
                )}
              </div>
            )}

            {/* ── Step 2 ── */}
            <div
              className={cn(
                'rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300',
                !isLoading && !isResult && 'opacity-30 pointer-events-none',
              )}
              style={{
                background: isResult
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(236,72,153,0.03) 100%)'
                  : '#181818',
                border: `1px solid ${isResult ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isResult ? '0 0 0 1px rgba(139,92,246,0.1), 0 8px 32px rgba(139,92,246,0.08)' : 'none',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                  style={isResult
                    ? { background: '#22C55E', color: '#fff' }
                    : isLoading
                    ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#C4B5FD' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.2)' }
                  }
                >
                  {isResult ? '✓' : '2'}
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: isResult ? '#fff' : isLoading ? '#C4B5FD' : 'rgba(255,255,255,0.2)' }}
                >
                  {t('videoGen.step2Label')}
                </span>
                {isResult && (
                  <span
                    className="ms-auto text-[9px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E' }}
                  >
                    {t('videoGen.ready')}
                  </span>
                )}
              </div>

              {isResult ? (
                <>
                  <VideoPlayer videoUrl={state.videoUrl} />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)', boxShadow: '0 2px 12px rgba(139,92,246,0.3)' }}
                    >
                      <Copy className="w-3 h-3" />
                      {t('videoGen.copyLink')}
                    </button>
                    <a
                      href={state.videoUrl}
                      download
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold no-underline"
                      style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}
                    >
                      <Download className="w-3 h-3" />
                      {t('videoGen.download')}
                    </a>
                    <button
                      onClick={handleReset}
                      className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-white/5"
                      style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}
                      title={t('videoGen.retry')}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : isLoading ? (
                <div
                  className="rounded-xl flex flex-col items-center justify-center gap-3 py-8"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.12)' }}
                >
                  <div
                    className="h-0.5 w-3/4 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(139,92,246,0.5) 40%, rgba(236,72,153,0.4) 60%, rgba(255,255,255,0.04) 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.6s ease infinite',
                    }}
                  />
                  <div
                    className="h-0.5 w-1/2 rounded-full opacity-60"
                    style={{
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(139,92,246,0.5) 40%, rgba(236,72,153,0.4) 60%, rgba(255,255,255,0.04) 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.6s ease 0.3s infinite',
                    }}
                  />
                  <p className="text-xs" style={{ color: '#C4B5FD', opacity: 0.7 }}>
                    {t('videoGen.processing')}
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-xl h-24 flex flex-col items-center justify-center gap-2"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.06)' }}
                >
                  <span style={{ fontSize: 22, opacity: 0.12 }}>▶</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {t('videoGen.videoPlaceholder')}
                  </span>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    );
  };

  export default VideoGenerator;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/pages/VideoGenerator.tsx src/assets/shuffll-logo.svg
  git commit -m "feat: add VideoGenerator page with sheet polling"
  ```

---

## Task 5: Register route in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import** (with the other public page imports near the top)

  ```tsx
  import VideoGenerator from "./pages/VideoGenerator";
  ```

- [ ] **Step 2: Add the route** inside `<Routes>`, right after the `"/"` landing page route

  Find:
  ```tsx
  {/* Landing page */}
  <Route path="/" element={<Index />} />
  ```

  Add immediately after:
  ```tsx
  {/* Video Generator — public, no auth */}
  <Route path="/video-generator" element={<VideoGenerator />} />
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/App.tsx
  git commit -m "feat: register /video-generator public route"
  ```

---

## Task 6: Verify in browser

- [ ] **Step 1: Start dev server**

  ```bash
  npm run dev
  ```

  Expected: server on `http://localhost:8080`

- [ ] **Step 2: Check idle state at `/video-generator`**

  Expected:
  - Black page, purple ambient glow at bottom
  - Shuffll horizontal logo top-left, LanguageSwitcher (globe dropdown) top-right
  - "Property **Video** Generator" headline — gradient on "Video"
  - Step 1 card glowing (purple border), Step 2 dimmed
  - Generate button disabled

- [ ] **Step 3: Check URL validation**

  Type `bad` → button stays disabled.
  Type `https://yad2.co.il/item/123` → button becomes enabled.

- [ ] **Step 4: Check loading + polling start**

  Click Generate. Expected:
  - Button shows spinner + "Working…"  (while awaiting Apps Script response)
  - After Apps Script responds with `rowIndex`, shimmer bars appear in Step 2
  - Console: no errors (polling calls Sheets API every 3s — will get a valid JSON response even if the cell is empty)

  *(Video won't appear until the Apps Script is wired up — that's expected.)*

- [ ] **Step 5: Check Hebrew RTL**

  Click LanguageSwitcher → עברית.
  Expected: layout flips RTL, Hebrew strings render, URL input stays `dir="ltr"`.

- [ ] **Step 6: Check responsive**

  Resize to ~375px. No horizontal overflow, buttons usable.

- [ ] **Step 7: Commit**

  ```bash
  git commit --allow-empty -m "chore: verified video-generator page in all states"
  ```

---

## Backend contract (for wiring up later)

The Apps Script web app must:

```
POST body:  { "url": "https://..." }
Success:    { "rowIndex": 42 }          ← 1-based row number in the sheet
Error:      { "error": "reason" }
```

The frontend then polls:
```
GET https://sheets.googleapis.com/v4/spreadsheets/1QO81dUtX_.../values/A42:AA42?key=...
```
and watches for a non-empty value at index `26` (column AA) of the returned row.
