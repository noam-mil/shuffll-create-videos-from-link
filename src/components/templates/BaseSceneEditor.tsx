import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Trash2, GripVertical, ChevronDown, ChevronRight, Upload, ImageIcon, Type, Clapperboard, Mic2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TemplateScene } from '@/types/template';
import { fileToBase64 } from '@/hooks/useImageGeneration';
import { supabase } from '@/integrations/supabase/client';

interface BaseSceneEditorProps {
  scene: TemplateScene;
  index: number;
  onUpdate: (updates: Partial<TemplateScene>) => void;
  onDelete: () => void;
}

export function BaseSceneEditor({ scene, index, onUpdate, onDelete }: BaseSceneEditorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Local state for text fields — prevents input lag from DB round-trips
  const [localName, setLocalName] = useState(scene.name);
  const [localPrompt, setLocalPrompt] = useState(scene.prompt || '');
  const [localDescription, setLocalDescription] = useState(scene.description || '');
  const [localVideoPrompt, setLocalVideoPrompt] = useState(scene.video_prompt || '');
  const [localVoiceScript, setLocalVoiceScript] = useState(scene.voice_script || '');
  const [localRefUrl, setLocalRefUrl] = useState<string | null>(scene.reference_url ?? null);

  // Sync from server when scene ID changes
  const sceneIdRef = useRef(scene.id);
  useEffect(() => {
    if (sceneIdRef.current !== scene.id) {
      sceneIdRef.current = scene.id;
      setLocalName(scene.name);
      setLocalPrompt(scene.prompt || '');
      setLocalDescription(scene.description || '');
      setLocalVideoPrompt(scene.video_prompt || '');
      setLocalVoiceScript(scene.voice_script || '');
      setLocalRefUrl(scene.reference_url ?? null);
    }
  }, [scene.id, scene.name, scene.prompt, scene.description, scene.video_prompt, scene.reference_url]);

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

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const b64 = await fileToBase64(file);
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `base-scenes/${scene.template_id}/${scene.id}.${ext}`;
      const blob = new Blob(
        [Uint8Array.from(atob(b64.data), c => c.charCodeAt(0))],
        { type: b64.mime }
      );
      const { data, error } = await supabase.storage
        .from('template-assets')
        .upload(path, blob, { contentType: b64.mime, upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('template-assets')
        .getPublicUrl(data.path);
      // Save clean URL to DB
      onUpdate({ reference_url: publicUrl });
      // Cache-bust the preview URL so the browser reloads the image even if the path is identical
      setLocalRefUrl(`${publicUrl}?t=${Date.now()}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const sceneTypeLabels: Record<string, string> = {
    first_frame: t('admin.templates.scene.firstFrame'),
    last_frame: t('admin.templates.scene.lastFrame'),
    single: t('admin.templates.scene.single'),
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
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
                {sceneTypeLabels[scene.scene_type] || scene.scene_type}
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

        <CollapsibleContent>
          <div className="border-t border-border/40 px-5 py-5 space-y-5">
            {/* Name & Type */}
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
                {localRefUrl ? (
                  <img
                    src={localRefUrl}
                    alt="Reference"
                    className="h-24 w-auto rounded-lg border border-border object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-24 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border/60 text-xs text-muted-foreground bg-muted/20">
                    {t('admin.templates.scene.noRef')}
                  </div>
                )}
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg" asChild disabled={uploading}>
                    <span><Upload className="h-3 w-3" /> {uploading ? t('common.loading') : t('admin.templates.scene.upload')}</span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />
                </label>
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
              {localPrompt && (localPrompt.includes('#XXXXXX') || localPrompt.includes('#YYYYYY') || localPrompt.includes('#ZZZZZZ')) && (
                <p className="text-[10px] text-muted-foreground/70 bg-muted/30 rounded-md px-2 py-1">
                  Contains color placeholders (#XXXXXX, #YYYYYY, #ZZZZZZ) — will be replaced with brand colors during production.
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

            {/* Default voice script */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Mic2 className="h-3 w-3" /> Default Voice Script
              </Label>
              <Textarea
                value={localVoiceScript}
                onChange={(e) => {
                  setLocalVoiceScript(e.target.value);
                  debouncedUpdate({ voice_script: e.target.value });
                }}
                placeholder="Default voice script. Use {{שם פרטי}} for recipient name, [fast] / [short pause] for ElevenLabs voice tags."
                className="min-h-[60px] text-sm resize-y"
                dir="auto"
              />
              {localVoiceScript && localVoiceScript.includes('{{שם פרטי}}') && (
                <p className="text-[10px] text-muted-foreground/70 bg-muted/30 rounded-md px-2 py-1">
                  Contains recipient name placeholder — will be replaced with the first name set in each production.
                </p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
