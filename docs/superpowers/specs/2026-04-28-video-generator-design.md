# Video Generator Page — Design Spec

**Date:** 2026-04-28
**Status:** Approved

---

## Overview

A standalone public page at `/video-generator` that lets a user paste a property listing URL, click one button, and receive a generated video — all powered by a Google Sheets / Apps Script backend. No authentication required.

---

## User Flow

1. User lands on `/video-generator`
2. **Step 1 (active):** URL input + "Generate →" button
3. User pastes a property URL (e.g. `https://www.yad2.co.il/item/abc123`)
4. Button becomes enabled; user clicks "Generate →"
5. **Step 2 (loading):** Button shows spinner ("Working…"), Step 2 card wakes with shimmer animation
6. Frontend POSTs URL to Google Apps Script web app endpoint (synchronous response)
7. Response returns `{ videoUrl: string }` (or `{ error: string }`)
8. **Step 2 (result):** Step 1 collapses to a compact done-row; Step 2 shows video player + Copy Link / Download / Reset actions
9. Reset (↺) returns to idle state

---

## Route & Auth

- **Route:** `/video-generator` — added as a top-level public route in `App.tsx` (no `MetaOrganizationProvider`, no `ProtectedRoute`)
- No authentication required

---

## Component Structure

```
src/pages/VideoGenerator.tsx       ← main page
```

Single-file page component. No sub-components needed — the page is focused enough to stay in one file.

### State machine (single `useState`)

```ts
type PageState =
  | { status: 'idle' }
  | { status: 'loading'; url: string }
  | { status: 'result'; url: string; videoUrl: string }
  | { status: 'error'; url: string; message: string }
```

---

## Google Sheets Integration

```ts
const SCRIPT_URL = 'REPLACE_WITH_APPS_SCRIPT_WEB_APP_URL';
```

Trigger mechanism:
```ts
const res = await fetch(SCRIPT_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: propertyUrl }),
});
const data = await res.json(); // { videoUrl: string } | { error: string }
```

- `SCRIPT_URL` is a module-level constant — easy to swap without touching logic
- On error response or network failure: show inline error under the input, keep URL in field so user can retry
- No polling — response is synchronous (Apps Script returns video URL directly)

---

## Video Display

- Detect URL type at render time:
  - If `videoUrl` matches `cloudflarestream.com` or contains a stream ID → render `<CloudflareVideoEmbed>` (reuse existing component)
  - Otherwise → plain `<video>` tag with `controls autoPlay playsInline`
- Aspect ratio: 16:9 (`aspect-video` Tailwind class)

---

## i18n

Uses the app's existing `useTranslation()` hook. Keys needed:

| Key | EN | HE |
|-----|----|----|
| `videoGen.title` | Property Video Generator | גנרטור וידאו לנכס |
| `videoGen.subtitle` | Paste a listing URL and get a professional video in seconds | הדביקו קישור למודעה וקבלו סרטון מקצועי תוך שניות |
| `videoGen.badge` | AI-Powered | מבוסס בינה מלאכותית |
| `videoGen.step1Label` | Property URL | קישור לנכס |
| `videoGen.placeholder` | https://www.yad2.co.il/item/... | https://www.yad2.co.il/item/... |
| `videoGen.generateBtn` | Generate → | צור סרטון → |
| `videoGen.generating` | Working… | עובד… |
| `videoGen.step2Label` | Your Video | הסרטון שלך |
| `videoGen.processing` | Analysing property data… | מנתח את פרטי הנכס… |
| `videoGen.copyLink` | Copy Link | העתק קישור |
| `videoGen.download` | Download | הורד |
| `videoGen.done` | Done | הושלם |
| `videoGen.ready` | Ready! | מוכן! |
| `videoGen.errorTitle` | Generation failed | יצירה נכשלה |

---

## Visual Design

Matches `shuffll.com` brand:

- **Background:** `#080808` with subtle radial purple/pink glow at bottom
- **Font:** Plus Jakarta Sans (Google Fonts) — 800 headlines, 700 labels, 600 body
- **Primary gradient:** `linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)` — used on CTA button, step badges, video play button
- **Cards:** `#181818` background, `rgba(255,255,255,0.07)` border; active step gets purple glow border + faint gradient background
- **Language toggle:** top-right pill (EN / עב), uses existing `LanguageSwitcher` component or inline
- **Responsive:** desktop-first max-width ~640px centered, collapses gracefully on mobile

---

## Error Handling

- Network failure or `{ error }` response → inline error message below URL input (red text, no toast)
- Invalid URL (not starting with `http`) → disabled button (no submission)
- User can always retry — error state shows URL pre-filled, button re-enabled

---

## Out of Scope

- No authentication or org context
- No history / saved videos
- No additional form fields (URL only)
- No server-side polling (response is synchronous)
