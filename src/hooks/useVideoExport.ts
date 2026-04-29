import { useCallback, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { TimelineSlot } from '@/components/templates/VideoTimeline';

export function useVideoExport() {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const exportVideo = useCallback(async ({
    slots,
    voiceAudioUrls = {},
    bgMusicUrl,
    fileName = 'production.mp4',
  }: {
    slots: TimelineSlot[];
    voiceAudioUrls?: Record<number, string | null>;
    bgMusicUrl?: string | null;
    fileName?: string;
  }) => {
    const playable = slots.filter(s => s.videoUrl);
    if (!playable.length) return;

    setExporting(true);
    setExportProgress(2);

    try {
      // Lazy-load FFmpeg single-thread variant (no SharedArrayBuffer / COOP headers needed)
      if (!ffmpegRef.current) {
        const ff = new FFmpeg();
        const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ff.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        ff.on('progress', ({ progress }) =>
          setExportProgress(10 + Math.round(progress * 80)));
        ffmpegRef.current = ff;
      }
      const ff = ffmpegRef.current;

      // 1. Write video clips + build concat list (with trim support)
      const concatLines: string[] = [];
      for (let i = 0; i < playable.length; i++) {
        await ff.writeFile(`v${i}.mp4`, await fetchFile(playable[i].videoUrl!));
        concatLines.push(`file 'v${i}.mp4'`);
        if (playable[i].trimStart > 0)
          concatLines.push(`inpoint ${playable[i].trimStart}`);
        if (playable[i].trimEnd != null)
          concatLines.push(`outpoint ${playable[i].trimEnd}`);
      }
      await ff.writeFile('list.txt', concatLines.join('\n'));
      await ff.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'merged.mp4']);

      // 2. Build audio filter graph
      const inputArgs: string[] = [];
      const filterParts: string[] = [];
      const mixLabels: string[] = [];
      let inputIdx = 1;

      // Voice audio per slot — delayed to the slot's cumulative start offset
      let offsetMs = 0;
      for (let i = 0; i < playable.length; i++) {
        const slot = playable[i];
        const url = voiceAudioUrls[slot.entryIndex];
        if (url) {
          await ff.writeFile(`vc${i}.mp3`, await fetchFile(url));
          inputArgs.push('-i', `vc${i}.mp3`);
          filterParts.push(`[${inputIdx}:a]adelay=${offsetMs}|${offsetMs}[va${i}]`);
          mixLabels.push(`[va${i}]`);
          inputIdx++;
        }
        const dur = slot.trimEnd != null
          ? slot.trimEnd - slot.trimStart
          : (slot.duration ?? 5);
        offsetMs += Math.round(dur * 1000);
      }

      // BG music at reduced volume
      if (bgMusicUrl) {
        await ff.writeFile('bg.mp3', await fetchFile(bgMusicUrl));
        inputArgs.push('-i', 'bg.mp3');
        filterParts.push(`[${inputIdx}:a]volume=0.3[vbg]`);
        mixLabels.push('[vbg]');
      }

      // 3. Final encode
      if (mixLabels.length === 0) {
        // No audio tracks — just copy video
        await ff.exec(['-i', 'merged.mp4', '-c', 'copy', 'output.mp4']);
      } else {
        const fc = [
          ...filterParts,
          `${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=first:normalize=0[aout]`,
        ].join('; ');
        await ff.exec([
          '-i', 'merged.mp4',
          ...inputArgs,
          '-filter_complex', fc,
          '-map', '0:v',
          '-map', '[aout]',
          '-c:v', 'copy',
          '-shortest',
          'output.mp4',
        ]);
      }

      // 4. Trigger download
      const data = await ff.readFile('output.mp4') as Uint8Array;
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setExportProgress(100);
    } finally {
      setExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  }, []);

  return { exportVideo, exporting, exportProgress };
}
