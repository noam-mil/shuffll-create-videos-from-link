import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play, Pause,
  Scissors, ArrowUpFromLine, Film, X,
  Volume2, VolumeX, Music2, Mic2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineSlot {
  entryIndex: number;
  label: string;
  videoUrl: string | null;
  sceneResultId: string | null;
  thumbnailUrl: string | null;
  trimStart: number;
  trimEnd: number | null;
  duration: number | null;
}

export interface VideoTimelineProps {
  slots: TimelineSlot[];
  onReorder: (newSlots: TimelineSlot[]) => void;
  onAssignVideo: (slotIndex: number, videoUrl: string) => void;
  onTrimChange: (slotIndex: number, trimStart: number, trimEnd: number | null) => void;
  onDurationLoaded: (slotIndex: number, duration: number) => void;
  bgMusicUrl?: string | null;
  voiceAudioUrls?: Record<number, string | null>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, '0');
  return `${m}:${sec}`;
}

function fmtShort(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function extractTrackName(url: string): string {
  let name = decodeURIComponent(url.split('/').pop() ?? '');
  name = name.replace(/\.[^.]+$/, '');        // strip extension
  name = name.replace(/^id\.\d+_/, '');       // strip "id.11_" prefix
  name = name.replace(/[-_]bg[-_]music$/i, ''); // strip "_bg-music" suffix
  name = name.replace(/[_-]/g, ' ').trim();   // underscores/hyphens → spaces
  return name.replace(/\b\w/g, c => c.toUpperCase()); // title case
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function VideoTimeline({
  slots,
  onReorder,
  onAssignVideo,
  onTrimChange,
  onDurationLoaded,
  bgMusicUrl,
  voiceAudioUrls,
}: VideoTimelineProps) {
  // ── UI state ──────────────────────────────────────────────────────────────────
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // ── Player state ──────────────────────────────────────────────────────────────
  const [playerCurrentIndex, setPlayerCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Imperative refs
  const playerIdxRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isAdvancingRef = useRef(false);
  const videoByEntry = useRef<Map<number, HTMLVideoElement>>(new Map());
  const playableSlotsRef = useRef<TimelineSlot[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playableSlots = slots.filter(s => s.videoUrl !== null);
  playableSlotsRef.current = playableSlots;

  useEffect(() => { playerIdxRef.current = playerCurrentIndex; }, [playerCurrentIndex]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => {
    videoByEntry.current.forEach(vid => { vid.muted = isMuted; });
    if (audioRef.current) audioRef.current.muted = isMuted;
    if (voiceAudioRef.current) voiceAudioRef.current.muted = isMuted;
  }, [isMuted]);

  // ── Player: advance ───────────────────────────────────────────────────────────

  const advanceToNext = useCallback(() => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setTimeout(() => { isAdvancingRef.current = false; }, 400);

    const idx = playerIdxRef.current;
    const slots_ = playableSlotsRef.current;

    const curSlot = slots_[idx];
    if (curSlot) videoByEntry.current.get(curSlot.entryIndex)?.pause();

    const nextIdx = idx + 1;
    if (nextIdx >= slots_.length) {
      setIsPlaying(false);
      setPlayerCurrentIndex(0);
      setPlayerCurrentTime(0);
      playerIdxRef.current = 0;
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 1;
      }
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current.currentTime = 0;
        voiceAudioRef.current.src = '';
      }
      const first = slots_[0];
      if (first) {
        const vid = videoByEntry.current.get(first.entryIndex);
        if (vid) vid.currentTime = first.trimStart;
      }
      return;
    }

    const nextSlot = slots_[nextIdx];
    const nextVid = nextSlot ? videoByEntry.current.get(nextSlot.entryIndex) : null;
    if (!nextVid || !nextSlot) return;

    playerIdxRef.current = nextIdx;
    setPlayerCurrentIndex(nextIdx);

    // Swap voice audio to next slot
    if (voiceAudioRef.current) {
      const url = voiceAudioUrls?.[nextSlot.entryIndex] ?? '';
      voiceAudioRef.current.pause();
      voiceAudioRef.current.src = url;
      voiceAudioRef.current.currentTime = 0;
      if (url) voiceAudioRef.current.play().catch(() => {});
    }

    const play = () => {
      nextVid.currentTime = nextSlot.trimStart;
      nextVid.play().catch(() => {});
    };
    if (nextVid.readyState >= 3) {
      play();
    } else {
      const onReady = () => { nextVid.removeEventListener('canplay', onReady); play(); };
      nextVid.addEventListener('canplay', onReady);
    }
  }, [voiceAudioUrls]);

  // ── Player: timeupdate ────────────────────────────────────────────────────────

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    const idx = playerIdxRef.current;
    const slot = playableSlotsRef.current[idx];
    if (!slot) return;
    if (vid !== videoByEntry.current.get(slot.entryIndex)) return;

    const end = slot.trimEnd ?? slot.duration ?? vid.duration;
    if (isFinite(end) && vid.currentTime >= end - 0.05) {
      advanceToNext();
      return;
    }
    setPlayerCurrentTime(vid.currentTime);
  }, [advanceToNext]);

  // ── Player: controls ──────────────────────────────────────────────────────────

  const togglePlay = () => {
    const idx = playerIdxRef.current;
    const slot = playableSlotsRef.current[idx];
    if (!slot?.videoUrl) return;
    const vid = videoByEntry.current.get(slot.entryIndex);
    if (!vid) return;
    if (isPlayingRef.current) {
      vid.pause();
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audioRef.current?.pause();
      voiceAudioRef.current?.pause();
    } else {
      const end = slot.trimEnd ?? slot.duration ?? vid.duration;
      if (vid.currentTime < slot.trimStart || (isFinite(end) && vid.currentTime >= end - 0.05)) {
        vid.currentTime = slot.trimStart;
      }
      vid.play().catch(() => {});
      if (voiceAudioRef.current) {
        const url = voiceAudioUrls?.[slot.entryIndex] ?? '';
        voiceAudioRef.current.pause();
        voiceAudioRef.current.src = url;
        voiceAudioRef.current.currentTime = 0;
        if (url) voiceAudioRef.current.play().catch(() => {});
      }
      if (audioRef.current && bgMusicUrl) {
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        audioRef.current.volume = 1;
        audioRef.current.currentTime = totalElapsed;
        audioRef.current.play().catch(() => {});
        const remaining = totalDuration - totalElapsed;
        if (remaining > 2) {
          fadeTimerRef.current = setTimeout(() => {
            let step = 0;
            fadeIntervalRef.current = setInterval(() => {
              if (!audioRef.current) { clearInterval(fadeIntervalRef.current!); return; }
              step++;
              audioRef.current.volume = Math.max(0, 1 - step * 0.05);
              if (audioRef.current.volume <= 0) clearInterval(fadeIntervalRef.current!);
            }, 100);
          }, (remaining - 2) * 1000);
        }
      }
    }
  };

  const jumpToSlot = (target: number) => {
    const slots_ = playableSlotsRef.current;
    const curSlot = slots_[playerIdxRef.current];
    curSlot && videoByEntry.current.get(curSlot.entryIndex)?.pause();
    const targetSlot = slots_[target];
    const targetVid = targetSlot ? videoByEntry.current.get(targetSlot.entryIndex) : null;
    if (!targetVid || !targetSlot) return;
    playerIdxRef.current = target;
    setPlayerCurrentIndex(target);
    targetVid.currentTime = targetSlot.trimStart;
    const absTime = slots_.slice(0, target).reduce((sum, s) =>
      sum + Math.max(0, (s.trimEnd ?? s.duration ?? 0) - s.trimStart), 0);
    if (audioRef.current) audioRef.current.currentTime = absTime;
    if (voiceAudioRef.current) {
      const url = voiceAudioUrls?.[targetSlot.entryIndex] ?? '';
      voiceAudioRef.current.pause();
      voiceAudioRef.current.src = url;
      voiceAudioRef.current.currentTime = 0;
      if (isPlayingRef.current && url) voiceAudioRef.current.play().catch(() => {});
    }
    if (isPlayingRef.current) targetVid.play().catch(() => {});
  };

  const seekToAbsoluteTime = useCallback((absoluteTime: number) => {
    const slots_ = playableSlotsRef.current;
    if (!slots_.length) return;
    let elapsed = 0;
    for (let i = 0; i < slots_.length; i++) {
      const slot = slots_[i];
      const dur = Math.max(0, (slot.trimEnd ?? slot.duration ?? 0) - slot.trimStart);
      if (absoluteTime < elapsed + dur || i === slots_.length - 1) {
        const offset = Math.max(0, Math.min(dur, absoluteTime - elapsed));
        const curSlot = slots_[playerIdxRef.current];
        curSlot && videoByEntry.current.get(curSlot.entryIndex)?.pause();
        playerIdxRef.current = i;
        setPlayerCurrentIndex(i);
        const vid = videoByEntry.current.get(slot.entryIndex);
        if (vid) {
          vid.currentTime = slot.trimStart + offset;
          if (audioRef.current) audioRef.current.currentTime = absoluteTime;
          if (voiceAudioRef.current) {
            const url = voiceAudioUrls?.[slot.entryIndex] ?? '';
            voiceAudioRef.current.pause();
            voiceAudioRef.current.src = url;
            voiceAudioRef.current.currentTime = 0;
            if (isPlayingRef.current && url) voiceAudioRef.current.play().catch(() => {});
          }
          if (isPlayingRef.current) vid.play().catch(() => {});
        }
        return;
      }
      elapsed += dur;
    }
  }, []);

  // ── Drag ─────────────────────────────────────────────────────────────────────

  const handleSlotDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('application/x-timeline-index', String(index));
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleSlotDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect =
      e.dataTransfer.types.includes('application/x-timeline-index') ? 'move' : 'copy';
    setDragOverIndex(index);
  };

  const handleSlotDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const url = e.dataTransfer.getData('application/x-video-url');
    if (url) { onAssignVideo(index, url); return; }
    const fromStr = e.dataTransfer.getData('application/x-timeline-index');
    if (fromStr !== '') {
      const from = Number(fromStr);
      if (from !== index) {
        const next = [...slots];
        const [moved] = next.splice(from, 1);
        next.splice(index, 0, moved);
        onReorder(next);
      }
    }
  };

  // ── Trim ─────────────────────────────────────────────────────────────────────

  const selectedSlot = selectedSlotIndex !== null ? slots[selectedSlotIndex] : null;
  const trimPreviewRef = useRef<HTMLVideoElement>(null);
  const selectedSlotRef = useRef(selectedSlot);
  useEffect(() => { selectedSlotRef.current = selectedSlot; }, [selectedSlot]);

  const trimSliderValue: [number, number] = selectedSlot
    ? [selectedSlot.trimStart, selectedSlot.trimEnd ?? selectedSlot.duration ?? 10]
    : [0, 10];

  const handleTrimSliderChange = ([start, end]: number[]) => {
    if (selectedSlotIndex === null) return;
    const slot = slots[selectedSlotIndex];
    const dur = slot.duration ?? null;
    const effectiveEnd = dur !== null && end >= dur - 0.05 ? null : end;
    onTrimChange(selectedSlotIndex, start, effectiveEnd);
  };

  useEffect(() => {
    const vid = trimPreviewRef.current;
    if (!vid) return;
    if (!selectedSlot?.videoUrl) { vid.src = ''; return; }
    if (vid.src !== selectedSlot.videoUrl) { vid.src = selectedSlot.videoUrl; vid.load(); }
    vid.currentTime = selectedSlot.trimStart;
    vid.play().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlot?.videoUrl, selectedSlot?.trimStart]);

  const handleTrimPreviewUpdate = useCallback(() => {
    const vid = trimPreviewRef.current;
    const slot = selectedSlotRef.current;
    if (!vid || !slot) return;
    const end = slot.trimEnd ?? slot.duration ?? vid.duration;
    if (isFinite(end) && vid.currentTime >= end - 0.05) vid.currentTime = slot.trimStart;
  }, []);

  // ── Progress ──────────────────────────────────────────────────────────────────

  const totalDuration = playableSlots.reduce((sum, s) =>
    sum + Math.max(0, (s.trimEnd ?? s.duration ?? 0) - s.trimStart), 0);

  const elapsedBefore = playableSlots.slice(0, playerCurrentIndex).reduce((sum, s) =>
    sum + Math.max(0, (s.trimEnd ?? s.duration ?? 0) - s.trimStart), 0);

  const curSlot = playableSlots[playerCurrentIndex];
  const curClipElapsed = curSlot ? Math.max(0, playerCurrentTime - curSlot.trimStart) : 0;
  const totalElapsed = elapsedBefore + curClipElapsed;
  const playheadPct = totalDuration > 0 ? (totalElapsed / totalDuration) * 100 : 0;

  // ── Timeline ruler ticks ──────────────────────────────────────────────────────

  const ticks = useMemo(() => {
    if (totalDuration <= 0) return [] as number[];
    const interval =
      totalDuration <= 12 ? 2 :
      totalDuration <= 30 ? 5 :
      totalDuration <= 90 ? 10 : 15;
    const marks: number[] = [];
    for (let t = 0; t <= totalDuration; t += interval)
      marks.push(Math.round(t * 10) / 10);
    return marks;
  }, [totalDuration]);

  // ── Timeline click-to-seek ────────────────────────────────────────────────────

  const handleTimelinePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (totalDuration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekToAbsoluteTime(pct * totalDuration);
  };

  // ── Clip width ────────────────────────────────────────────────────────────────

  const getClipWidth = (slot: TimelineSlot): string => {
    if (!slot.videoUrl) return '72px';
    if (!slot.duration) return '80px';
    const dur = Math.max(0, (slot.trimEnd ?? slot.duration) - slot.trimStart);
    if (totalDuration === 0 || dur === 0) return '80px';
    return `${(dur / totalDuration) * 100}%`;
  };

  const hasAnyVideo = slots.some(s => s.videoUrl !== null);
  if (slots.length === 0) return null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Large 9:16 preview ── */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-52 aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-xl">
          {playableSlots.map((slot, i) => (
            <video
              key={slot.entryIndex}
              ref={el => {
                if (el) videoByEntry.current.set(slot.entryIndex, el);
                else videoByEntry.current.delete(slot.entryIndex);
              }}
              src={slot.videoUrl!}
              className={`absolute inset-0 w-full h-full object-contain ${
                i === playerCurrentIndex ? 'block' : 'hidden'
              }`}
              preload="auto"
              playsInline
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onEnded={advanceToNext}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => {
                const d = (e.currentTarget as HTMLVideoElement).duration;
                if (!isFinite(d)) return;
                const si = slots.findIndex(s => s.entryIndex === slot.entryIndex);
                if (si >= 0) onDurationLoaded(si, d);
              }}
            />
          ))}
          {playableSlots.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 text-xs text-center px-4">
              No videos yet
            </div>
          )}
        </div>

        {/* Controls: time | play | total | mute */}
        <div className="flex items-center gap-3">
          <span className="text-sm tabular-nums font-mono w-12 text-right text-foreground">
            {fmtShort(totalElapsed)}
          </span>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full shadow"
            onClick={togglePlay}
            disabled={playableSlots.length === 0}
          >
            {isPlaying
              ? <Pause className="h-4 w-4" />
              : <Play className="h-4 w-4 translate-x-0.5" />
            }
          </Button>
          <span className="text-sm tabular-nums font-mono w-12 text-muted-foreground">
            {fmtShort(totalDuration)}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsMuted(m => !m)}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted
              ? <VolumeX className="h-4 w-4" />
              : <Volume2 className="h-4 w-4" />
            }
          </Button>
        </div>
      </div>

      {/* ── Timeline (ruler + filmstrip) ── */}
      <div className="select-none space-y-0">

        {/* Ruler */}
        <div
          className="relative h-7 cursor-pointer overflow-hidden"
          onPointerDown={handleTimelinePointerDown}
        >
          {/* Tick marks */}
          {ticks.map(tick => (
            <div
              key={tick}
              className="absolute top-0 flex flex-col items-center"
              style={{
                left: `${(tick / Math.max(totalDuration, 0.001)) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="h-2.5 w-px bg-border mt-0.5" />
              <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
                {tick}s
              </span>
            </div>
          ))}

          {/* Playhead head (diamond) */}
          {totalDuration > 0 && (
            <div
              className="absolute top-0.5 pointer-events-none z-20"
              style={{ left: `${playheadPct}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-2.5 h-2.5 bg-primary rounded-sm rotate-45 shadow-sm" />
            </div>
          )}
        </div>

        {/* Filmstrip clip strip */}
        <div
          className="relative flex rounded-lg overflow-hidden border border-border/60 cursor-pointer"
          style={{ height: 76 }}
          onPointerDown={handleTimelinePointerDown}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const url = e.dataTransfer.getData('application/x-video-url');
            if (url) {
              const empty = slots.findIndex(s => !s.videoUrl);
              if (empty >= 0) onAssignVideo(empty, url);
            }
          }}
        >
          {/* Playhead line */}
          {totalDuration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none shadow-[0_0_4px_rgba(var(--primary),0.6)]"
              style={{ left: `${playheadPct}%` }}
            />
          )}

          {slots.map((slot, idx) => {
            const clipDur = slot.duration
              ? Math.max(0, (slot.trimEnd ?? slot.duration) - slot.trimStart)
              : null;
            const isActive =
              playableSlots[playerCurrentIndex]?.entryIndex === slot.entryIndex && isPlaying;
            const isSelected = selectedSlotIndex === idx;
            const isDragOver = dragOverIndex === idx;
            const isTrimmed = slot.trimStart > 0 || slot.trimEnd !== null;

            return (
              <div
                key={slot.entryIndex}
                className={[
                  'relative h-full flex-shrink-0 overflow-hidden border-r border-white/10 transition-[filter,box-shadow]',
                  slot.videoUrl ? 'cursor-pointer' : 'cursor-default bg-muted/20',
                  isActive ? 'brightness-[1.12]' : '',
                  isSelected ? 'ring-2 ring-inset ring-primary' : '',
                  isDragOver ? 'ring-2 ring-inset ring-primary/80 brightness-110' : '',
                ].filter(Boolean).join(' ')}
                style={{
                  width: getClipWidth(slot),
                  minWidth: slot.videoUrl ? '48px' : '64px',
                }}
                draggable={!!slot.videoUrl}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSlotIndex(prev => prev === idx ? null : idx);
                  if (slot.videoUrl) {
                    const pIdx = playableSlots.findIndex(s => s.entryIndex === slot.entryIndex);
                    if (pIdx >= 0) {
                      const absStart = playableSlots.slice(0, pIdx).reduce((sum, s) =>
                        sum + Math.max(0, (s.trimEnd ?? s.duration ?? 0) - s.trimStart), 0);
                      seekToAbsoluteTime(absStart);
                    }
                  }
                }}
                onDragStart={(e) => handleSlotDragStart(e, idx)}
                onDragOver={(e) => { e.stopPropagation(); handleSlotDragOver(e, idx); }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => { e.stopPropagation(); handleSlotDrop(e, idx); }}
              >
                {slot.videoUrl ? (
                  <>
                    {/* Thumbnail */}
                    {slot.thumbnailUrl
                      ? <img src={slot.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      : <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          <Film className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                    }
                    {/* Bottom gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                    {/* Active tint */}
                    {isActive && (
                      <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                    )}
                    {/* Label */}
                    <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] text-white font-medium truncate leading-tight drop-shadow-sm pointer-events-none">
                      {slot.label}
                    </span>
                    {/* Duration badge */}
                    {clipDur !== null && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] text-white/80 font-mono bg-black/40 rounded px-1 leading-tight pointer-events-none">
                        {fmt(clipDur)}
                      </span>
                    )}
                    {/* Trim indicator */}
                    {isTrimmed && (
                      <Scissors className="absolute top-1.5 left-1.5 h-2.5 w-2.5 text-amber-400 drop-shadow pointer-events-none" />
                    )}
                    {/* Hover tooltip */}
                    {hoveredIdx === idx && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 bg-popover text-popover-foreground text-[10px] font-medium px-2 py-1 rounded shadow-md border border-border whitespace-nowrap pointer-events-none">
                        {slot.label}
                        {clipDur !== null && <span className="text-muted-foreground ml-1">· {fmt(clipDur)}</span>}
                      </div>
                    )}
                    {/* Hidden video for duration loading */}
                    <video
                      src={slot.videoUrl}
                      preload="metadata"
                      className="hidden"
                      onLoadedMetadata={(e) => {
                        const d = (e.currentTarget as HTMLVideoElement).duration;
                        if (isFinite(d)) onDurationLoaded(idx, d);
                      }}
                    />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1 border-dashed border border-border/50"
                    onDragOver={(e) => { e.preventDefault(); handleSlotDragOver(e, idx); }}
                  >
                    <ArrowUpFromLine className="h-3 w-3 text-muted-foreground/40" />
                    <span className="text-[8px] text-muted-foreground/40 text-center leading-tight px-1">
                      {slot.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Not-yet-generated hint */}
        {playableSlots.length < slots.length && (
          <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-right">
            {slots.length - playableSlots.length} clip
            {slots.length - playableSlots.length > 1 ? 's' : ''} not yet generated
          </p>
        )}

        {/* ── Voice track row ── */}
        {voiceAudioUrls && Object.values(voiceAudioUrls).some(u => u !== null) && (
          <div
            className="flex items-stretch rounded-md overflow-hidden border border-emerald-500/25 mt-1"
            style={{ height: 28 }}
          >
            {/* Label */}
            <div className="flex items-center gap-1.5 px-2.5 bg-emerald-950/50 border-r border-emerald-500/25 flex-shrink-0">
              <Mic2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
              <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                Voice
              </span>
            </div>
            {/* Per-slot blocks */}
            <div className="relative flex-1 flex overflow-hidden">
              {playableSlots.map((slot, i) => (
                <div
                  key={slot.entryIndex}
                  className={[
                    'h-full flex-shrink-0 flex items-center justify-center border-r border-emerald-500/10 transition-opacity',
                    voiceAudioUrls[slot.entryIndex] ? 'bg-emerald-950/40' : 'bg-muted/10 opacity-40',
                    i === playerCurrentIndex && isPlaying ? 'brightness-125' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ width: getClipWidth(slot), minWidth: slot.videoUrl ? '48px' : '64px' }}
                >
                  {voiceAudioUrls[slot.entryIndex]
                    ? <span className="text-[8px] text-emerald-400/70 truncate px-1">voice</span>
                    : <span className="text-[8px] text-muted-foreground/30 truncate px-1">—</span>
                  }
                </div>
              ))}
              {/* Playhead */}
              {totalDuration > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary/50 z-10 pointer-events-none"
                  style={{ left: `${playheadPct}%` }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── BG Music track row ── */}
        {bgMusicUrl && (
          <div
            className="flex items-stretch rounded-md overflow-hidden border border-violet-500/25 mt-1.5"
            style={{ height: 28 }}
          >
            {/* Label */}
            <div className="flex items-center gap-1.5 px-2.5 bg-violet-950/50 border-r border-violet-500/25 flex-shrink-0">
              <Music2 className="h-3 w-3 text-violet-400 flex-shrink-0" />
              <span className="text-[9px] font-semibold text-violet-400 uppercase tracking-wider whitespace-nowrap">
                BG Music
              </span>
            </div>

            {/* Track bar */}
            <div className="relative flex-1 bg-violet-950/20 overflow-hidden flex items-center gap-2 px-2.5">
              {/* Playhead continuation */}
              {totalDuration > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary/50 z-10 pointer-events-none"
                  style={{ left: `${playheadPct}%` }}
                />
              )}

              {/* Decorative waveform bars */}
              <div className="flex items-center gap-px h-full py-1.5 flex-shrink-0 pointer-events-none">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full transition-opacity duration-300 ${
                      isPlaying ? 'opacity-80' : 'opacity-30'
                    } bg-violet-400`}
                    style={{
                      height: `${Math.max(15, Math.abs(
                        Math.sin(i * 0.55) * 55 + Math.cos(i * 1.2) * 30 + 25
                      ))}%`,
                    }}
                  />
                ))}
              </div>

              {/* Track name */}
              <span className="text-[9px] font-medium text-violet-300/70 truncate z-10 relative">
                {extractTrackName(bgMusicUrl)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!hasAnyVideo && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <ArrowUpFromLine className="h-4 w-4 shrink-0" />
          <span>Generate videos above, then drag them here to build your timeline.</span>
        </div>
      )}

      {/* ── Background music (hidden) ── */}
      {bgMusicUrl && (
        <audio ref={audioRef} src={bgMusicUrl} preload="auto" style={{ display: 'none' }} />
      )}

      {/* ── Voice audio (hidden, src set imperatively) ── */}
      <audio ref={voiceAudioRef} preload="auto" style={{ display: 'none' }} />

      {/* ── Trim panel ── */}
      {selectedSlot?.videoUrl && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Scissors className="h-4 w-4" /> Trim — {selectedSlot.label}
            </span>
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0"
              onClick={() => setSelectedSlotIndex(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-4 items-start">
            {/* 9:16 looping preview */}
            <div className="relative flex-shrink-0 w-20 aspect-[9/16] rounded-md overflow-hidden bg-black border border-border">
              <video
                ref={trimPreviewRef}
                className="absolute inset-0 w-full h-full object-contain"
                muted
                playsInline
                onTimeUpdate={handleTrimPreviewUpdate}
              />
            </div>

            <div className="flex-1 space-y-2 pt-1">
              <p className="text-xs text-muted-foreground">
                Drag both handles to set in and out points
              </p>
              <Slider
                min={0}
                max={selectedSlot.duration ?? 10}
                step={0.1}
                value={trimSliderValue}
                onValueChange={handleTrimSliderChange}
              />
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>In&nbsp;&nbsp;{fmt(trimSliderValue[0])}</span>
                <span>Out {fmt(trimSliderValue[1])}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm" variant="outline" className="flex-1"
                  onClick={() => selectedSlotIndex !== null && onTrimChange(selectedSlotIndex, 0, null)}
                >
                  Reset
                </Button>
                <Button
                  size="sm" className="flex-1"
                  onClick={() => setSelectedSlotIndex(null)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
