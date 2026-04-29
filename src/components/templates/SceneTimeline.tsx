import { useTranslation } from 'react-i18next';
import { Download, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineSlot {
  sceneId: string;
  sceneName: string;
  imageSrc: string | null;
}

interface SceneTimelineProps {
  slots: TimelineSlot[];
  onDownloadAll: () => void;
}

export function SceneTimeline({ slots, onDownloadAll }: SceneTimelineProps) {
  const { t } = useTranslation();
  const hasAnyImages = slots.some(s => s.imageSrc);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {t('admin.templates.editor.timeline')}
        </h3>
        {hasAnyImages && (
          <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground" onClick={onDownloadAll}>
            <Download className="h-3 w-3" />
            {t('admin.templates.editor.downloadAll')}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {slots.map((slot, idx) => (
          <div key={slot.sceneId} className="flex items-center gap-1.5 flex-shrink-0">
            <div className="group relative">
              <div
                className={`w-[56px] h-[100px] rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 ${
                  slot.imageSrc
                    ? 'border-2 border-primary/40 shadow-sm shadow-primary/10 group-hover:border-primary/70 group-hover:shadow-md group-hover:shadow-primary/20 group-hover:scale-105'
                    : 'border-2 border-dashed border-border/50 bg-muted/20'
                }`}
              >
                {slot.imageSrc ? (
                  <img
                    src={slot.imageSrc}
                    alt={slot.sceneName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <span className="text-[8px] text-muted-foreground/70 leading-tight line-clamp-2">
                      {slot.sceneName}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {idx < slots.length - 1 && (
              <ChevronRight className="h-3 w-3 text-border flex-shrink-0" />
            )}
          </div>
        ))}

        {slots.length === 0 && (
          <div className="text-xs text-muted-foreground/50 py-6 text-center w-full">
            {t('admin.templates.editor.noScenesHint')}
          </div>
        )}
      </div>
    </div>
  );
}
