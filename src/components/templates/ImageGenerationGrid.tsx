import { Loader2, Check, Download, Pin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SceneGenerationSlot } from '@/types/template';

interface ImageGenerationGridProps {
  slots: SceneGenerationSlot[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  onSaveAsRef: (idx: number) => void;
}

export function ImageGenerationGrid({
  slots,
  selectedIdx,
  onSelect,
  onSaveAsRef,
}: ImageGenerationGridProps) {
  const handleDownload = (src: string, idx: number) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `generated-${idx + 1}.jpg`;
    link.click();
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {slots.map((slot, idx) => (
        <div
          key={idx}
          className={`group relative aspect-[9/16] rounded-xl overflow-hidden transition-all duration-200 ${
            selectedIdx === idx
              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/20'
              : 'border border-border/60 hover:border-border'
          } ${slot.status === 'idle' ? 'bg-muted/20' : 'bg-background'}`}
        >
          {/* Idle state */}
          {slot.status === 'idle' && (
            <div className="flex h-full items-center justify-center">
              <span className="text-lg font-light text-muted-foreground/30">
                {idx + 1}
              </span>
            </div>
          )}

          {/* Loading state */}
          {slot.status === 'loading' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-primary/5 to-primary/10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <Loader2 className="h-6 w-6 animate-spin text-primary relative" />
              </div>
              <span className="text-[10px] text-muted-foreground">Generating...</span>
            </div>
          )}

          {/* Error state */}
          {slot.status === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-3 bg-destructive/5">
              <AlertCircle className="h-5 w-5 text-destructive/60" />
              <span className="text-[10px] text-destructive/80 text-center leading-tight">{slot.error}</span>
            </div>
          )}

          {/* Done state with image */}
          {slot.status === 'done' && slot.src && (
            <>
              <img
                src={slot.src}
                alt={`Result ${idx + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {/* Hover overlay with action buttons */}
              <div className="absolute inset-x-0 bottom-0 flex gap-1 p-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  size="sm"
                  variant={selectedIdx === idx ? 'default' : 'secondary'}
                  className="h-7 flex-1 text-[10px] gap-1 rounded-lg font-medium"
                  onClick={() => onSelect(idx)}
                >
                  {selectedIdx === idx ? (
                    <><Check className="h-3 w-3" /> Selected</>
                  ) : (
                    'Select'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-7 p-0 rounded-lg"
                  onClick={() => handleDownload(slot.src!, idx)}
                  title="Download"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-7 p-0 rounded-lg"
                  onClick={() => onSaveAsRef(idx)}
                  title="Save as reference"
                >
                  <Pin className="h-3 w-3" />
                </Button>
              </div>
              {/* Selected indicator badge */}
              {selectedIdx === idx && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
