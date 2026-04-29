import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Loader2, Sparkles, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TemplateScene } from '@/types/template';
import type { VideoState, StartVideoParams } from '@/hooks/useVideoStates';

interface VideoEntry {
  type: 'single' | 'pair';
  scene?: TemplateScene;
  firstScene?: TemplateScene;
  lastScene?: TemplateScene;
}

interface VideoCardProps {
  entry: VideoEntry;
  entryIndex: number;
  selectedImages: Record<string, string>;
  videoState: VideoState;
  onGenerate: (params: StartVideoParams) => void;
  onCancel: () => void;
  onReset: () => void;
}

function VideoCard({
  entry,
  entryIndex,
  selectedImages,
  videoState,
  onGenerate,
  onCancel,
  onReset,
}: VideoCardProps) {
  const { t } = useTranslation();
  const { status, videoUrl, error, progress } = videoState;
  const [motionPrompt, setMotionPrompt] = useState(
    entry.type === 'single'
      ? entry.scene?.video_prompt || ''
      : entry.firstScene?.video_prompt || ''
  );
  const [isDragging, setIsDragging] = useState(false);

  const handleGenerate = () => {
    const firstSrc = entry.type === 'single'
      ? selectedImages[entry.scene!.id]
      : selectedImages[entry.firstScene!.id];
    const lastSrc = entry.type === 'pair'
      ? selectedImages[entry.lastScene!.id]
      : undefined;
    onGenerate({ firstFrameSrc: firstSrc, lastFrameSrc: lastSrc, prompt: motionPrompt });
  };

  const sceneName = entry.type === 'single'
    ? entry.scene?.name
    : `${entry.firstScene?.name} → ${entry.lastScene?.name}`;

  const handleDragStart = (e: React.DragEvent) => {
    if (!videoUrl) { e.preventDefault(); return; }
    e.dataTransfer.setData('application/x-video-url', videoUrl);
    e.dataTransfer.setData('application/x-entry-index', String(entryIndex));
    e.dataTransfer.setData('application/x-scene-label', sceneName ?? `Scene ${entryIndex + 1}`);
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  return (
    <Card
      className={`flex-shrink-0 w-72 transition-opacity ${isDragging ? 'opacity-60' : ''}`}
      draggable={status === 'done' && !!videoUrl}
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{sceneName}</CardTitle>
          {status === 'done' && videoUrl && (
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" title="Drag to timeline" />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Frame preview(s) */}
        <div className={`flex gap-2 ${entry.type === 'pair' ? 'justify-between' : 'justify-center'}`}>
          {entry.type === 'single' && entry.scene && (
            <div className="w-20 h-36 rounded border border-border overflow-hidden">
              {selectedImages[entry.scene.id] ? (
                <img src={selectedImages[entry.scene.id]} alt="Frame" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  {t('admin.templates.video.noImage')}
                </div>
              )}
            </div>
          )}
          {entry.type === 'pair' && (
            <>
              <div className="text-center">
                <span className="text-[10px] text-muted-foreground">{t('admin.templates.video.first')}</span>
                <div className="w-20 h-36 rounded border border-border overflow-hidden">
                  {entry.firstScene && selectedImages[entry.firstScene.id] ? (
                    <img src={selectedImages[entry.firstScene.id]} alt="First" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">—</div>
                  )}
                </div>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-muted-foreground">{t('admin.templates.video.last')}</span>
                <div className="w-20 h-36 rounded border border-border overflow-hidden">
                  {entry.lastScene && selectedImages[entry.lastScene.id] ? (
                    <img src={selectedImages[entry.lastScene.id]} alt="Last" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">—</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Motion prompt */}
        <div className="space-y-1">
          <Label className="text-xs">{t('admin.templates.video.motionPrompt')}</Label>
          <Input
            value={motionPrompt}
            onChange={(e) => setMotionPrompt(e.target.value)}
            placeholder={t('admin.templates.video.motionPlaceholder')}
            className="h-7 text-xs"
          />
        </div>

        {/* Status / controls */}
        {status === 'idle' && (
          <Button size="sm" className="w-full gap-1.5" onClick={handleGenerate}>
            <Play className="h-3 w-3" /> {t('admin.templates.video.generateVideo')}
          </Button>
        )}

        {(status === 'starting' || status === 'polling') && (
          <div className="space-y-2">
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {status === 'starting' ? t('admin.templates.video.starting') : `${Math.round(progress)}%`}
              </span>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onCancel}>
                <Square className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {status === 'done' && videoUrl && (
          <div className="space-y-2">
            <video src={videoUrl} controls className="w-full rounded border border-border" />
            <div className="flex gap-1">
              <a
                href={videoUrl}
                download={`${sceneName}.mp4`}
                className="flex-1 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-7 text-xs font-medium"
              >
                {t('admin.templates.video.download')}
              </a>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onReset}>
                {t('admin.templates.video.reset')}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Drag to timeline below ↓
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-2">
            <p className="text-xs text-destructive">{error}</p>
            <Button size="sm" variant="outline" className="w-full" onClick={onReset}>
              {t('admin.templates.video.tryAgain')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface VideoGeneratorSectionProps {
  entries: VideoEntry[];
  selectedImages: Record<string, string>;
  videoStates: VideoState[];
  onGenerate: (index: number, params: StartVideoParams) => void;
  onCancel: (index: number) => void;
  onReset: (index: number) => void;
  onGenerateAll: () => void;
}

export function VideoGeneratorSection({
  entries,
  selectedImages,
  videoStates,
  onGenerate,
  onCancel,
  onReset,
  onGenerateAll,
}: VideoGeneratorSectionProps) {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t('admin.templates.video.noEntries')}</p>
      </div>
    );
  }

  const allDone = videoStates.every(s => s.status === 'done');
  const anyRunning = videoStates.some(s => s.status === 'starting' || s.status === 'polling');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('admin.templates.video.title')}
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-full h-7 text-xs"
          onClick={onGenerateAll}
          disabled={allDone || anyRunning}
        >
          {anyRunning ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Generate All
        </Button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {entries.map((entry, idx) => (
          <VideoCard
            key={idx}
            entry={entry}
            entryIndex={idx}
            selectedImages={selectedImages}
            videoState={videoStates[idx] ?? { status: 'idle', videoUrl: null, error: null, progress: 0 }}
            onGenerate={(params) => onGenerate(idx, params)}
            onCancel={() => onCancel(idx)}
            onReset={() => onReset(idx)}
          />
        ))}
      </div>
    </div>
  );
}

export type { VideoEntry };
