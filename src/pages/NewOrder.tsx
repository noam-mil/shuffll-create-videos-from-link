import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { OrgLayout } from '@/components/layouts/OrgLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const DRIVE_API_KEY       = 'AIzaSyAQEL3RhP6ugU1Lnav-Aoj4EXsRU8wdKAU';
const CONTROLLER_SHEET_ID = '1QeoKCfszovycGR1Wg8HwgYxY0n5Lb4SYRmcwTWu5few';

interface Template {
  id: string;
  name: string;
  event: string;
  thumbnail: string | null;
  loadingThumb: boolean;
  sheetId: string | null;
  videoUrl?: string;
  cfStreamId?: string;
  cfCustomer?: string;
}

interface FormState {
  company: string;
  name: string;
  phone: string;
  event: string;
}

interface EventInfo { key: string; label: string; }

/* ── Cloudflare Stream templates ── */
const CF_STREAM_TEMPLATES: Template[] = [
  {
    id:           'cf-b08facb2eccf96a6624f1739caf411b8',
    name:         'Video Template',
    cfStreamId:   'b08facb2eccf96a6624f1739caf411b8',
    cfCustomer:   'pi79d1jim1s9bdzv',
    event:        '',
    sheetId:      null,
    thumbnail:    'https://customer-pi79d1jim1s9bdzv.cloudflarestream.com/b08facb2eccf96a6624f1739caf411b8/thumbnails/thumbnail.jpg',
    loadingThumb: false,
  },
];

/* ── Direct MP4 video templates ── */
const V_BASE = 'https://content.shuffll.com/template-assets/formats/example_videos/';
const VIDEO_TEMPLATES: Template[] = [
  { id:'v1', name:'Confetti Forecast — Cartoon',  event:'birthday', videoUrl: V_BASE + 'Confetti%20Forecast_cartoon.mp4'     },
  { id:'v2', name:'Confetti Forecast — Realistic', event:'birthday', videoUrl: V_BASE + 'Confetti%20Forecast_Realistic.mp4'    },
  { id:'v3', name:'Cosmic Birthday',               event:'birthday', videoUrl: V_BASE + 'cosmic_birthday.mp4'                  },
  { id:'v4', name:'DJ Party — Cartoon',            event:'birthday', videoUrl: V_BASE + 'dj_party_cartoon.mp4'                 },
  { id:'v5', name:'DJ Party — Realistic',          event:'birthday', videoUrl: V_BASE + 'dj_party_realistic.mp4'               },
  { id:'v6', name:'Elevator Gift',                 event:'',         videoUrl: V_BASE + 'id.05_Elevator-Gift_Correct-Gifts.mp4'},
  { id:'v7', name:'Gift Truck',                    event:'',         videoUrl: V_BASE + 'id.06_Gift-Truck_Correct-Gifts.mp4'   },
  { id:'v8', name:'Van Cartoon — Holiday',         event:'holiday',  videoUrl: V_BASE + 'van_cartoon_holiday.MP4'              },
  { id:'v9', name:'Van Cartoon',                   event:'',         videoUrl: V_BASE + 'van_cartoon.mp4'                      },
].map(t => ({ ...t, thumbnail: null, loadingThumb: false, sheetId: null }));

const CF_STREAM_OVERRIDES: Record<string, { cfStreamId: string; cfCustomer: string }> = {
  'dj party': { cfStreamId: 'be8613b7eb233035dd3a6ad940fd9096', cfCustomer: 'pi79d1jim1s9bdzv' },
};

function cfOverrideFor(name: string) {
  const low = name.toLowerCase();
  const entry = Object.entries(CF_STREAM_OVERRIDES).find(([k]) => low.includes(k));
  return entry ? entry[1] : null;
}

function fixUrl(u: string | null | undefined): string | null {
  return u ? u.replace(/content\.shufll\.com/gi, 'content.shuffll.com') : null;
}

function normaliseEvent(raw = ''): EventInfo {
  const s = raw.toLowerCase().trim();
  if (s.includes('birthday'))                                                              return { key: 'birthday',   label: 'יום הולדת' };
  if (s.includes('passover') || s.includes('holiday') || s.includes('purim') || s.includes('chanukah') || s.includes('pesach'))
                                                                                           return { key: 'holiday',    label: 'חג' };
  if (s.includes('bar') || s.includes('bat') || s.includes('mitzvah'))                   return { key: 'barmitzvah', label: 'בר/בת מצווה' };
  if (s.includes('corporate') || s.includes('business') || s.includes('b2b'))            return { key: 'corporate',  label: 'עסקי' };
  return { key: 'default', label: raw || 'כללי' };
}

const EVENT_BADGE: Record<string, string> = {
  birthday:   'bg-amber-100 text-amber-700 border-amber-200',
  holiday:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  barmitzvah: 'bg-purple-100 text-purple-700 border-purple-200',
  corporate:  'bg-blue-100 text-blue-700 border-blue-200',
  default:    'bg-muted text-muted-foreground border-border',
};

/* ── Template card ── */
function TemplateCard({ tmpl, selected, onSelect, onPreview }: {
  tmpl: Template;
  selected: boolean;
  onSelect: (t: Template) => void;
  onPreview: (t: Template) => void;
}) {
  const event      = normaliseEvent(tmpl.event);
  const isPlayable = !!(tmpl.videoUrl || tmpl.thumbnail || tmpl.cfStreamId);

  return (
    <Card className={cn(
      'group overflow-hidden rounded-2xl border-2 bg-card transition-all duration-300 cursor-pointer flex flex-col',
      'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]',
      selected ? 'border-primary shadow-[var(--shadow-glow)]' : 'border-border hover:-translate-y-1',
    )}>
      {/* Thumbnail */}
      <div
        className="aspect-[9/16] relative overflow-hidden bg-muted"
        onClick={() => isPlayable && onPreview(tmpl)}
        style={{ cursor: isPlayable ? 'pointer' : 'default' }}
      >
        {tmpl.videoUrl ? (
          <video
            src={tmpl.videoUrl}
            preload="metadata"
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onLoadedMetadata={e => { e.currentTarget.currentTime = 0.1; }}
          />
        ) : tmpl.thumbnail ? (
          <img
            src={tmpl.thumbnail}
            alt={tmpl.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => {
              const img = e.currentTarget as HTMLImageElement & { dataset: { retried?: string } };
              if (!img.dataset.retried) {
                img.dataset.retried = '1';
                setTimeout(() => { const s = img.src; img.src = ''; img.src = s; }, 1500);
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {tmpl.loadingThumb
              ? <Loader2 className="w-6 h-6 animate-spin" />
              : <span className="text-xs font-semibold uppercase tracking-wide opacity-50">אין תצוגה</span>
            }
          </div>
        )}

        {/* Play overlay */}
        {isPlayable && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/25 transition-colors duration-200">
            <div className="bg-primary/90 backdrop-blur-sm rounded-full p-4 scale-0 group-hover:scale-100 transition-transform duration-200 shadow-lg">
              <Play className="w-7 h-7 text-primary-foreground fill-current" />
            </div>
          </div>
        )}

        {/* Event badge overlay */}
        <div className="absolute top-2 left-2">
          <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border', EVENT_BADGE[event.key])}>
            {event.label}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-semibold text-card-foreground leading-snug line-clamp-2">{tmpl.name}</p>
        <Button
          variant={selected ? 'default' : 'outline'}
          size="sm"
          className="w-full mt-auto text-xs font-bold"
          onClick={() => onSelect(tmpl)}
        >
          {selected ? '✓ נבחרה' : 'בחר תבנית'}
        </Button>
      </div>
    </Card>
  );
}

/* ── Preview lightbox ── */
function Lightbox({ tmpl, onClose }: { tmpl: Template; onClose: () => void }) {
  const isCfStream    = !!tmpl.cfStreamId;
  const isDirectVideo = !!tmpl.videoUrl;

  const mediaStyle: React.CSSProperties = {
    width:  'min(45vh, 82vw)',
    height: 'min(80vh, 145.8vw)',
    borderRadius: 12,
    display: 'block',
    boxShadow: '0 24px 80px rgba(0,0,0,.5)',
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="bg-transparent border-none shadow-none p-0 max-w-none w-auto flex flex-col items-center gap-3">
        <DialogTitle className="sr-only">{tmpl.name} preview</DialogTitle>
        {isCfStream ? (
          <iframe
            src={
              tmpl.cfCustomer
                ? `https://customer-${tmpl.cfCustomer}.cloudflarestream.com/${tmpl.cfStreamId}/iframe?autoplay=true`
                : `https://iframe.cloudflare.com/media/${tmpl.cfStreamId}?autoplay=true`
            }
            style={{ ...mediaStyle, border: 'none' }}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : isDirectVideo ? (
          <video
            src={tmpl.videoUrl}
            autoPlay
            controls
            playsInline
            style={{ ...mediaStyle, background: '#000', objectFit: 'contain' }}
          />
        ) : (
          <img src={tmpl.thumbnail ?? undefined} alt={tmpl.name} style={mediaStyle} className="object-contain" />
        )}
        <p className="text-sm font-semibold text-white/80">{tmpl.name}</p>
      </DialogContent>
    </Dialog>
  );
}

/* ── Order modal ── */
const EVENT_OPTIONS  = ['יום הולדת', 'חג', 'בר מצווה', 'בת מצווה', 'עסקי', 'חתונה', 'אחר'];
const GREETING_OPTIONS = ['מאחל', 'מאחלת', 'מאחלים', 'מאחלות'];
const EVENT_HE: Record<string, string> = {
  'יום הולדת': 'יום הולדת', 'חג': 'חג',
  'בר מצווה': 'בר מצווה', 'בת מצווה': 'בת מצווה',
  'עסקי': 'אירוע', 'חתונה': 'חתונה', 'אחר': 'אירוע',
};

function StepDot({ state, label }: { state: 'done' | 'active' | 'pending'; label: string }) {
  return (
    <div className={cn(
      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
      state === 'done'    && 'bg-emerald-500 text-white',
      state === 'active'  && 'bg-primary text-primary-foreground',
      state === 'pending' && 'bg-muted text-muted-foreground border border-border',
    )}>
      {state === 'done' ? '✓' : label}
    </div>
  );
}

function OrderModal({ tmpl, metaOrgSlug, onClose }: { tmpl: Template; metaOrgSlug?: string; onClose: () => void }) {
  const event = normaliseEvent(tmpl.event);

  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState<FormState>({ company: '', name: '', phone: '', event: event.label || 'יום הולדת' });
  const [logo,      setLogo]      = useState<string | null>(null);
  const [logoName,  setLogoName]  = useState('');
  const [logoFile,  setLogoFile]  = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [msgCompany,  setMsgCompany]  = useState('');
  const [greeting,    setGreeting]    = useState('מאחלת');
  const [submitted,   setSubmitted]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  const validStep1 = form.company.trim() && form.name.trim() && form.phone.trim();
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoName(f.name);
    setLogoFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setLogo(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validStep1) return;
    setMsgCompany(form.company);
    setStep(2);
  };

  const submitOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    const resolvedCompany = msgCompany.trim() || form.company;
    const eventHe = EVENT_HE[form.event] || form.event || 'אירוע';
    const computedFullMsg = `${resolvedCompany} ${greeting} לך ${eventHe} שמח! 🎉\n\nשמחים לשלוח לך את הסרטון המיוחד שיצרנו עבורך 🎬\n\n👉 [קישור לסרטון]`;

    // Upload logo to Supabase storage
    let logoUrl: string | null = null;
    if (logoFile) {
      const ext   = logoName.split('.').pop() || 'png';
      const slug  = metaOrgSlug || 'general';
      const path  = `${slug}/${Date.now()}_${logoName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-logos')
        .upload(path, logoFile, { contentType: logoFile.type || `image/${ext}`, upsert: false });
      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('order-logos').getPublicUrl(uploadData.path);
        logoUrl = publicUrl;
      } else if (uploadError) {
        console.error('Logo upload failed:', uploadError.message);
      }
    }

    // Save to Supabase
    const { error } = await supabase.from('orders').insert({
      company_name:  form.company,
      full_name:     form.name,
      phone:         form.phone,
      logo_filename: logoName || null,
      logo_url:      logoUrl,
      event_type:    form.event,
      msg_company:   resolvedCompany,
      greeting,
      template_name: tmpl.name,
      full_message:  computedFullMsg,
      meta_org_slug: metaOrgSlug || null,
    });
    if (error) console.error('Order save failed:', error.message);

    // Also forward to local server if running
    fetch('http://127.0.0.1:3030/submit-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: form.company, name: form.name, phone: form.phone, logo: logoName || '', event: form.event, msgCompany: resolvedCompany, greeting, template: tmpl.name }),
    }).catch(() => { /* local server optional */ });

    setSubmitted(true);
  };

  const displayCo = msgCompany.trim() || form.company.trim() || '[שם החברה]';
  const eventHe   = EVENT_HE[form.event] || form.event || 'אירוע';
  const fullMsg   = `${displayCo} ${greeting} לך ${eventHe} שמח! 🎉\n\nשמחים לשלוח לך את הסרטון המיוחד שיצרנו עבורך 🎬\n\n👉 [קישור לסרטון]`;

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: step === 2 ? 840 : 520, transition: 'max-width .25s ease' }}
      >
        <DialogTitle className="sr-only">הזמנה — {tmpl.name}</DialogTitle>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border" dir="rtl">
          {tmpl.thumbnail && (
            <div className="w-11 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
              <img src={tmpl.thumbnail} alt={tmpl.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">הזמנה — {tmpl.name}</p>
            <p className="text-xs text-muted-foreground">{step === 1 ? 'מלאו את הפרטים' : 'אשרו את ההודעה'}</p>
          </div>

          {/* Step indicator */}
          {!submitted && (
            <div className="flex items-center gap-1 mr-2">
              <StepDot state={step > 1 ? 'done' : 'active'} label="1" />
              <div className={cn('h-0.5 w-7', step > 1 ? 'bg-emerald-500' : 'bg-border')} />
              <StepDot state={step === 2 ? 'active' : 'pending'} label="2" />
            </div>
          )}
        </div>

        {/* Content */}
        {submitted ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <span className="text-5xl">🎬</span>
            <h3 className="text-lg font-bold">ההזמנה נשלחה!</h3>
            <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl">
              תודה, <strong>{form.name}</strong>!<br />
              קיבלנו את הזמנתך עבור <strong>{tmpl.name}</strong>.<br />
              הצוות שלנו יצור קשר עם <strong>{form.company}</strong> בקרוב.
            </p>
            <Button variant="celebration" className="mt-2" onClick={onClose}>סיום</Button>
          </div>

        ) : step === 1 ? (
          <form onSubmit={handleNext} dir="rtl">
            <div className="px-5 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    שם חברה <span className="text-primary">*</span>
                  </Label>
                  <Input placeholder="לדוגמה: אקמי בע״מ" value={form.company} onChange={e => set('company', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    שמך <span className="text-primary">*</span>
                  </Label>
                  <Input placeholder="לדוגמה: דנה כהן" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    טלפון <span className="text-primary">*</span>
                  </Label>
                  <Input placeholder="+972 50 000 0000" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} dir="ltr" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">סוג אירוע</Label>
                  <Select value={form.event} onValueChange={v => set('event', v)}>
                    <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
                    <SelectContent dir="rtl">
                      {EVENT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  לוגו מותג <span className="text-muted-foreground font-normal normal-case tracking-normal">(אופציונלי)</span>
                </Label>
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-lg border-2 border-dashed p-3 cursor-pointer transition-colors',
                    logo ? 'border-emerald-400 bg-emerald-50' : 'border-border hover:border-primary hover:bg-primary/5',
                  )}
                  onClick={() => fileRef.current?.click()}
                >
                  {logo
                    ? <img src={logo} alt="logo" className="w-10 h-10 rounded-lg object-contain bg-card p-1 border border-border" />
                    : <span className="text-2xl">🖼</span>
                  }
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{logoName || 'לחצו להעלאת לוגו'}</span>
                    <span className="text-xs text-muted-foreground">{logo ? 'לחצו לשינוי' : 'PNG, SVG או JPG'}</span>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                </div>
              </div>
            </div>

            <div className="flex justify-start gap-2 px-5 pb-5">
              <Button type="submit" variant="celebration" disabled={!validStep1}>המשך</Button>
              <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
            </div>
          </form>

        ) : (
          <>
            <div className="grid grid-cols-[1fr_1.5fr] gap-5 px-5 pt-5" dir="rtl">
              {/* Right (RTL): inputs */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    שם החברה בהודעה <span className="text-primary">*</span>
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder={form.company}
                    className="resize-none text-right"
                    value={msgCompany}
                    onChange={e => setMsgCompany(e.target.value)}
                    dir="rtl"
                  />
                  <p className="text-[10px] text-muted-foreground">איך השם מופיע בהודעות ללקוחות</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">צורת פנייה (נטייה)</Label>
                  <Select value={greeting} onValueChange={setGreeting}>
                    <SelectTrigger className="text-right" dir="rtl"><SelectValue /></SelectTrigger>
                    <SelectContent dir="rtl">
                      {GREETING_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right: phone mockups */}
              <div className="flex gap-3 justify-center items-start">
                <div className="flex flex-col items-center gap-1.5">
                  <img
                    src="https://content.shuffll.com/template-assets/formats/example_videos/1.png"
                    alt="WhatsApp preview"
                    className="h-[240px] w-auto rounded-2xl shadow-lg object-contain"
                  />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">WhatsApp</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <img
                    src="https://content.shuffll.com/template-assets/formats/example_videos/2.png"
                    alt="Landing page preview"
                    className="h-[240px] w-auto rounded-2xl shadow-lg object-contain"
                  />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Landing page</span>
                </div>
              </div>
            </div>

            {/* Full message preview */}
            <div className="px-5 pt-4 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">תצוגה מקדימה של ההודעה</p>
              <div className="bg-muted rounded-lg p-3 text-sm leading-relaxed whitespace-pre-line text-right" dir="rtl">
                {fullMsg}
              </div>
            </div>

            <div className="flex justify-start gap-2 px-5 py-4" dir="rtl">
              <Button variant="celebration" onClick={submitOrder} disabled={submitting}>
                {submitting ? 'שולח...' : 'שלח הזמנה'}
              </Button>
              <Button variant="outline" onClick={() => setStep(1)}>חזרה</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Main page ── */
const NewOrder = () => {
  const { metaOrgSlug } = useParams<{ metaOrgSlug: string }>();
  const [templates,    setTemplates]    = useState<Template[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selected,     setSelected]     = useState<string | null>(null);
  const [ordering,     setOrdering]     = useState<Template | null>(null);
  const [previewing,   setPreviewing]   = useState<Template | null>(null);

  useEffect(() => {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONTROLLER_SHEET_ID}/values/A1:E50?key=${DRIVE_API_KEY}`)
      .then(r => r.json())
      .then((data: { values?: string[][] }) => {
        const rows = (data.values || []).slice(1)
          .filter(r => r[0] && r[1] && r[2] && r[3]?.trim().toLowerCase() === 'true');
        const list: Template[] = rows.map(r => {
          const name = r[1].trim();
          const cf   = cfOverrideFor(name);
          return {
            id:           r[0].trim(),
            name,
            sheetId:      r[2].match(/\/d\/([^/]+)/)?.[1] || null,
            event:        r[4]?.trim() || '',
            thumbnail:    cf ? `https://customer-${cf.cfCustomer}.cloudflarestream.com/${cf.cfStreamId}/thumbnails/thumbnail.jpg` : null,
            loadingThumb: !cf,
            ...(cf || {}),
          };
        });
        setTemplates([...VIDEO_TEMPLATES, ...CF_STREAM_TEMPLATES, ...list]);
        setLoading(false);

        list.forEach(tmpl => {
          if (tmpl.cfStreamId) return;
          if (!tmpl.sheetId) {
            setTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, loadingThumb: false } : t));
            return;
          }
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${tmpl.sheetId}/values/A2:H3?key=${DRIVE_API_KEY}`)
            .then(r => r.json())
            .then((d: { values?: string[][] }) => {
              const firstRow = (d.values || [])[0];
              const thumbUrl = fixUrl(firstRow?.[2]?.trim() || null);
              setTemplates(prev => prev.map(t =>
                t.id === tmpl.id ? { ...t, thumbnail: thumbUrl, loadingThumb: false } : t
              ));
            })
            .catch(() => {
              setTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, loadingThumb: false } : t));
            });
        });
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const cats: EventInfo[] = [{ key: 'all', label: 'הכל' }];
    templates.forEach(t => {
      const ev = normaliseEvent(t.event);
      if (!seen.has(ev.key)) { seen.add(ev.key); cats.push(ev); }
    });
    return cats;
  }, [templates]);

  const visible = activeFilter === 'all'
    ? templates
    : templates.filter(t => normaliseEvent(t.event).key === activeFilter);

  const handleSelect = (tmpl: Template) => {
    setSelected(tmpl.id);
    setOrdering(tmpl);
  };

  return (
    <OrgLayout>
      <div className="container mx-auto px-6 py-10" dir="rtl">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">הזמנת פרויקט</h1>
          <p className="text-muted-foreground">בחרו תבנית וידאו ושלחו הזמנה</p>
        </div>

        {/* Section label */}
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">ספריית תבניות</p>

        {/* Category filter tabs */}
        {categories.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-7">
            {categories.map(cat => (
              <Button
                key={cat.key}
                variant={activeFilter === cat.key ? 'default' : 'outline'}
                size="sm"
                className="rounded-full text-xs font-semibold"
                onClick={() => setActiveFilter(cat.key)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        )}

        {/* Template grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-9 h-9 animate-spin text-primary" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-semibold text-foreground mb-2">לא נמצאו תבניות</p>
            <p className="text-sm">נסו קטגוריה אחרת או חיזרו מאוחר יותר.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-5">
            {visible.map(tmpl => (
              <TemplateCard
                key={tmpl.id}
                tmpl={tmpl}
                selected={selected === tmpl.id}
                onSelect={handleSelect}
                onPreview={t => setPreviewing(t)}
              />
            ))}
          </div>
        )}

        {/* Lightbox */}
        {previewing && (
          <Lightbox tmpl={previewing} onClose={() => setPreviewing(null)} />
        )}

        {/* Order modal */}
        {ordering && (
          <OrderModal tmpl={ordering} metaOrgSlug={metaOrgSlug} onClose={() => { setOrdering(null); setSelected(null); }} />
        )}
      </div>
    </OrgLayout>
  );
};

export default NewOrder;
