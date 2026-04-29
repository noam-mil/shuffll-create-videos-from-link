import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Upload, Trash2, GripVertical, ChevronDown, ChevronRight, ImageIcon, Type, Clapperboard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImageGenerationGrid } from './ImageGenerationGrid';
import type { TemplateScene, SceneGenerationSlot, BrandColors } from '@/types/template';
import { resolveColorPlaceholders } from '@/types/template';
import { generateSceneImages, fileToBase64 } from '@/hooks/useImageGeneration';

interface SceneEditorProps {
  scene: TemplateScene;
  index: number;
  brandColors: BrandColors;
  logoData: { data: string; mime: string } | null;
  logoUrl?: string | null;
  savedRef: { src: string; sceneName: string } | null;
  onUpdate: (updates: Partial<TemplateScene>) => void;
  onDelete: () => void;
  onSelectImage: (sceneId: string, src: string) => void;
  onSaveRef: (src: string, sceneName: string) => void;
  onImagesGenerated?: (sceneId: string, images: Array<{ image: string; mimeType: string }>) => void;
}

export function SceneEditor({
  scene,
  index,
  brandColors,
  logoData,
  logoUrl,
  savedRef,
  onUpdate,
  onDelete,
  onSelectImage,
  onSaveRef,
  onImagesGenerated,
}: SceneEditorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [slots, setSlots] = useState<SceneGenerationSlot[]>(
    Array.from({ length: 4 }, () => ({ status: 'idle', src: null, error: null }))
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [customRef, setCustomRef] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Local state for text fields — prevents input lag from DB round-trips
  const [localName, setLocalName] = useState(scene.name);
  const [localPrompt, setLocalPrompt] = useState(scene.prompt || '');
  const [localDescription, setLocalDescription] = useState(scene.description || '');
  const [localVideoPrompt, setLocalVideoPrompt] = useState(scene.video_prompt || '');

  // Sync from server when scene prop changes (e.g. after refetch)
  const sceneIdRef = useRef(scene.id);
  useEffect(() => {
    if (sceneIdRef.current !== scene.id) {
      sceneIdRef.current = scene.id;
      setLocalName(scene.name);
      setLocalPrompt(scene.prompt || '');
      setLocalDescription(scene.description || '');
      setLocalVideoPrompt(scene.video_prompt || '');
    }
  }, [scene.id, scene.name, scene.prompt, scene.description, scene.video_prompt]);

  // Debounced save to DB
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedUpdate = useCallback(
    (updates: Partial<TemplateScene>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate(updates);
      }, 500);
    },
    [onUpdate]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const resolvedPrompt = resolveColorPlaceholders(localPrompt, brandColors);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setSlots(Array.from({ length: 4 }, () => ({ status: 'loading', src: null, error: null })));

    try {
      const results = await generateSceneImages({
        prompt: localPrompt,
        referenceUrl: customRef || scene.reference_url,
        referenceUrl2: savedRef?.src,
        logoData,
        logoUrl,
        brandColors,
        description: localDescription,
      }, 4);

      setSlots(results.map(r => {
        if ('error' in r) return { status: 'error', src: null, error: r.error };
        return { status: 'done', src: `data:${r.mimeType};base64,${r.image}`, error: null };
      }));

      // Persist generated images if callback provided (production mode)
      if (onImagesGenerated) {
        const successful = results.filter((r): r is { image: string; mimeType: string } => !('error' in r));
        if (successful.length > 0) {
          onImagesGenerated(scene.id, successful);
        }
      }
    } catch {
      setSlots(Array.from({ length: 4 }, () => ({
        status: 'error',
        src: null,
        error: 'Generation failed',
      })));
    } finally {
      setIsGenerating(false);
    }
  }, [scene, customRef, savedRef, logoData, brandColors]);

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    const src = slots[idx]?.src;
    if (src) onSelectImage(scene.id, src);
  };

  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setCustomRef(`data:${b64.mime};base64,${b64.data}`);
  };

  const sceneTypeLabels: Record<string, string> = {
    first_frame: t('admin.templates.scene.firstFrame'),
    last_frame: t('admin.templates.scene.lastFrame'),
    single: t('admin.templates.scene.single'),
  };
  const sceneTypeLabel = sceneTypeLabels[scene.scene_type] || scene.scene_type;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
        {/* Collapsed header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer group">
            <div className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {index + 1}
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-semibold truncate">{scene.name}</span>
              <Badge variant="outline" className="text-[10px] font-normal shrink-0 ml-1">
                {sceneTypeLabel}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CollapsibleTrigger>

        {/* Expanded content */}
        <CollapsibleContent>
          <div className="border-t border-border/40 px-5 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
              {/* Left column: Scene settings */}
              <div className="space-y-5">
                {/* Name & Type row */}
                <div className="grid grid-cols-[1fr_140px] gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Type className="h-3 w-3" /> {t('admin.templates.scene.sceneName')}
                    </Label>
                    <Input
                      value={localName}
                      onChange={(e) => {
                        setLocalName(e.target.value);
                        debouncedUpdate({ name: e.target.value });
                      }}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t('admin.templates.scene.type')}</Label>
                    <Select
                      value={scene.scene_type}
                      onValueChange={(v) => onUpdate({ scene_type: v as TemplateScene['scene_type'] })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">{t('admin.templates.scene.single')}</SelectItem>
                        <SelectItem value="first_frame">{t('admin.templates.scene.firstFrame')}</SelectItem>
                        <SelectItem value="last_frame">{t('admin.templates.scene.lastFrame')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reference image */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-3 w-3" /> {t('admin.templates.scene.referenceImage')}
                  </Label>
                  <div className="flex gap-3 items-start">
                    {(customRef || scene.reference_url) ? (
                      <img
                        src={customRef || scene.reference_url!}
                        alt="Reference"
                        className="h-24 w-auto rounded-lg border border-border object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-24 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border/60 text-xs text-muted-foreground bg-muted/20">
                        {t('admin.templates.scene.noRef')}
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg" asChild>
                          <span><Upload className="h-3 w-3" /> {t('admin.templates.scene.upload')}</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />
                      </label>
                      {savedRef && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs rounded-lg"
                          onClick={() => setCustomRef(savedRef.src)}
                        >
                          {t('admin.templates.scene.useSavedRef')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prompt */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t('admin.templates.scene.prompt')}</Label>
                  <Textarea
                    value={localPrompt}
                    onChange={(e) => {
                      setLocalPrompt(e.target.value);
                      debouncedUpdate({ prompt: e.target.value });
                    }}
                    placeholder={t('admin.templates.scene.promptPlaceholder')}
                    className="min-h-[90px] text-sm resize-y"
                  />
                  {localPrompt && resolvedPrompt !== localPrompt && (
                    <p className="text-[10px] text-muted-foreground/70 bg-muted/30 rounded-md px-2 py-1">
                      {t('admin.templates.scene.resolved')}: {resolvedPrompt.slice(0, 120)}...
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t('admin.templates.scene.description')}</Label>
                  <Textarea
                    value={localDescription}
                    onChange={(e) => {
                      setLocalDescription(e.target.value);
                      debouncedUpdate({ description: e.target.value });
                    }}
                    placeholder={t('admin.templates.scene.descPlaceholder')}
                    className="min-h-[60px] text-sm resize-y"
                  />
                </div>

                {/* Video prompt */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clapperboard className="h-3 w-3" /> {t('admin.templates.scene.videoMotionPrompt')}
                  </Label>
                  <Input
                    value={localVideoPrompt}
                    onChange={(e) => {
                      setLocalVideoPrompt(e.target.value);
                      debouncedUpdate({ video_prompt: e.target.value });
                    }}
                    placeholder={t('admin.templates.scene.videoMotionPlaceholder')}
                    className="h-9"
                  />
                </div>

                {/* Generate button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !localPrompt}
                  className="gap-2 rounded-full shadow-sm"
                  size="sm"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {isGenerating ? t('admin.templates.scene.generating') : t('admin.templates.scene.generate')}
                </Button>
              </div>

              {/* Right column: Generation results */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> {t('admin.templates.scene.results')}
                </Label>
                <ImageGenerationGrid
                  slots={slots}
                  selectedIdx={selectedIdx}
                  onSelect={handleSelect}
                  onSaveAsRef={(idx) => {
                    const src = slots[idx]?.src;
                    if (src) onSaveRef(src, scene.name);
                  }}
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
