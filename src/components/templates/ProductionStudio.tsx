import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Film, Loader2, Upload, Video, Sparkles, Layers, Mic2, User2, Download } from 'lucide-react';
import { generateVoice, uploadVoiceAudio } from '@/hooks/useElevenLabs';
import { useVideoExport } from '@/hooks/useVideoExport';
import { useTemplate } from '@/hooks/useTemplates';
import { useTemplateScenes } from '@/hooks/useTemplateScenes';
import { useProduction, useUpdateProduction } from '@/hooks/useTemplateProductions';
import { useProductionSceneResults, useUpdateSceneResult } from '@/hooks/useProductionSceneResults';
import { BrandColorPicker } from '@/components/templates/BrandColorPicker';
import { SceneEditor } from '@/components/templates/SceneEditor';
import { SceneTimeline } from '@/components/templates/SceneTimeline';
import { VideoGeneratorSection } from '@/components/templates/VideoGeneratorSection';
import { VideoTimeline } from '@/components/templates/VideoTimeline';
import { useToast } from '@/hooks/use-toast';
import { fileToBase64, extractDominantColors, uploadGeneratedImage } from '@/hooks/useImageGeneration';
import { useVideoStates } from '@/hooks/useVideoStates';
import type { BrandColors, TemplateScene, ProductionSceneWithBase } from '@/types/template';
import type { TimelineSlot } from '@/components/templates/VideoTimeline';
import type { StartVideoParams } from '@/hooks/useVideoStates';

interface ProductionStudioProps {
  templateId: string;
  productionId: string;
  backUrl: string;
}

export function ProductionStudio({ templateId, productionId, backUrl }: ProductionStudioProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { toast } = useToast();

  const { data: template, isLoading: templateLoading } = useTemplate(templateId);
  const { data: baseScenes = [], isLoading: scenesLoading } = useTemplateScenes(templateId);
  const { data: production, isLoading: productionLoading } = useProduction(productionId);
  const { data: sceneResults = [], isLoading: resultsLoading } = useProductionSceneResults(productionId);
  const updateProduction = useUpdateProduction();
  const updateSceneResult = useUpdateSceneResult();

  const [brandColors, setBrandColors] = useState<BrandColors>({
    primary: '#888888',
    secondary: '#444444',
    accent: '#222222',
  });
  const [logoData, setLogoData] = useState<{ data: string; mime: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savedRef, setSavedRef] = useState<{ src: string; sceneName: string } | null>(null);
  const [videoMode, setVideoMode] = useState(false);
  const [colorsInitialized, setColorsInitialized] = useState(false);
  const [timelineSlotsVideo, setTimelineSlotsVideo] = useState<TimelineSlot[]>([]);
  const timelineInitialized = useRef(false);
  const { exportVideo, exporting, exportProgress } = useVideoExport();
  const [voiceGenerating, setVoiceGenerating] = useState<Record<string, boolean>>({});
  const [voiceScripts, setVoiceScripts] = useState<Record<string, string>>({});
  const voiceScriptsInitialized = useRef(false);
  const voiceScriptTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [firstName, setFirstName] = useState('');
  const firstNameInitialized = useRef(false);
  const firstNameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize brand colors from production once loaded
  if (production && !colorsInitialized) {
    if (production.brand_primary || production.brand_secondary || production.brand_accent) {
      setBrandColors({
        primary: production.brand_primary || '#888888',
        secondary: production.brand_secondary || '#444444',
        accent: production.brand_accent || '#222222',
      });
    }
    if (production.logo_url) {
      setLogoPreview(production.logo_url);
    }
    setColorsInitialized(true);
  }

  // Initialize first_name from production once loaded
  useEffect(() => {
    if (firstNameInitialized.current || !production) return;
    setFirstName(production.first_name || '');
    firstNameInitialized.current = true;
  }, [production]);

  // Load logo base64 from production.logo_url
  useEffect(() => {
    if (!production?.logo_url || logoData) return;
    (async () => {
      try {
        const res = await fetch(production.logo_url!);
        if (!res.ok) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setLogoData({ data: result.split(',')[1], mime: blob.type || 'image/png' });
        };
        reader.readAsDataURL(blob);
      } catch {
        // Logo will still display from preview URL
      }
    })();
  }, [production?.logo_url, logoData]);

  // Merge base scenes with production results
  const mergedScenes: ProductionSceneWithBase[] = useMemo(() => {
    return sceneResults.map(result => {
      const baseScene = baseScenes.find(s => s.id === result.template_scene_id);
      if (!baseScene) return null;
      return {
        baseScene,
        result,
        effectivePrompt: result.prompt_override ?? baseScene.prompt,
        effectiveDescription: result.description_override ?? baseScene.description,
        effectiveReferenceUrl: result.custom_reference_url ?? baseScene.reference_url,
      };
    }).filter(Boolean) as ProductionSceneWithBase[];
  }, [baseScenes, sceneResults]);

  // Build selected images map
  const selectedImages: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sr of sceneResults) {
      if (sr.selected_image_url) map[sr.template_scene_id] = sr.selected_image_url;
    }
    return map;
  }, [sceneResults]);

  // Build video entries
  const videoEntries = useMemo(() => mergedScenes.reduce<Array<{
    type: 'single' | 'pair';
    scene?: TemplateScene;
    firstScene?: TemplateScene;
    lastScene?: TemplateScene;
  }>>((acc, merged, idx) => {
    const scene = merged.baseScene;
    const next = mergedScenes[idx + 1]?.baseScene;
    const prev = mergedScenes[idx - 1]?.baseScene;
    if (scene.scene_type === 'first_frame' && next?.scene_type === 'last_frame') {
      acc.push({ type: 'pair', firstScene: scene, lastScene: next });
    } else if (scene.scene_type === 'last_frame' && prev?.scene_type === 'first_frame') {
      // skip — already paired
    } else {
      acc.push({ type: 'single', scene });
    }
    return acc;
  }, []), [mergedScenes]);

  // ── Video state callbacks ────────────────────────────────────────────────────

  const handleVideoStarted = useCallback((index: number) => {
    const entry = videoEntries[index];
    if (!entry) return;
    const sceneId = entry.type === 'single' ? entry.scene!.id : entry.firstScene!.id;
    const result = sceneResults.find(r => r.template_scene_id === sceneId);
    if (result) updateSceneResult.mutate({ id: result.id, video_status: 'generating' });
  }, [videoEntries, sceneResults, updateSceneResult]);

  const handleVideoComplete = useCallback((index: number, videoUrl: string) => {
    const entry = videoEntries[index];
    if (!entry) return;
    const sceneId = entry.type === 'single' ? entry.scene!.id : entry.firstScene!.id;
    const result = sceneResults.find(r => r.template_scene_id === sceneId);
    if (result) {
      updateSceneResult.mutate({ id: result.id, video_url: videoUrl, video_status: 'done' });
    }
    setTimelineSlotsVideo(prev =>
      prev.map(s => s.entryIndex === index ? { ...s, videoUrl } : s)
    );
  }, [videoEntries, sceneResults, updateSceneResult]);

  const handleVideoError = useCallback((index: number) => {
    const entry = videoEntries[index];
    if (!entry) return;
    const sceneId = entry.type === 'single' ? entry.scene!.id : entry.firstScene!.id;
    const result = sceneResults.find(r => r.template_scene_id === sceneId);
    if (result) updateSceneResult.mutate({ id: result.id, video_status: 'error' });
  }, [videoEntries, sceneResults, updateSceneResult]);

  // ── useVideoStates hook ──────────────────────────────────────────────────────

  const { states: videoStates, generate, cancel, reset, generateAll } = useVideoStates(
    videoEntries.length,
    handleVideoStarted,
    handleVideoComplete,
    handleVideoError,
  );

  const handleGenerate = useCallback((index: number, params: StartVideoParams) => {
    void generate(index, params);
  }, [generate]);

  const handleGenerateAll = useCallback(() => {
    void generateAll((i) => {
      const entry = videoEntries[i];
      const sceneId = entry?.type === 'single' ? entry.scene?.id : entry?.firstScene?.id;
      return {
        firstFrameSrc: sceneId ? selectedImages[sceneId] : undefined,
        lastFrameSrc: entry?.type === 'pair' && entry.lastScene
          ? selectedImages[entry.lastScene.id]
          : undefined,
        prompt: (entry?.type === 'single' ? entry.scene?.video_prompt : entry?.firstScene?.video_prompt) ?? '',
      };
    });
  }, [generateAll, videoEntries, selectedImages]);

  // ── Timeline slot initialization (once, from DB) ─────────────────────────────

  const initialTimelineSlots = useMemo<TimelineSlot[]>(() =>
    videoEntries.map((entry, idx) => {
      const sceneId = entry.type === 'single' ? entry.scene!.id : entry.firstScene!.id;
      const result = sceneResults.find(r => r.template_scene_id === sceneId);
      const label = entry.type === 'single'
        ? (entry.scene?.name ?? `Scene ${idx + 1}`)
        : `${entry.firstScene?.name ?? ''} → ${entry.lastScene?.name ?? ''}`;
      return {
        entryIndex: idx,
        label,
        videoUrl: result?.video_url ?? null,
        sceneResultId: result?.id ?? null,
        thumbnailUrl: selectedImages[sceneId] ?? null,
        trimStart: 0,
        trimEnd: null,
        duration: null,
      };
    }),
  [videoEntries, sceneResults, selectedImages]);

  useEffect(() => {
    if (!timelineInitialized.current && initialTimelineSlots.length > 0) {
      setTimelineSlotsVideo(initialTimelineSlots);
      timelineInitialized.current = true;
    }
  }, [initialTimelineSlots]);

  // Initialize voice scripts from DB (once); fall back to base scene template
  useEffect(() => {
    if (voiceScriptsInitialized.current || sceneResults.length === 0 || baseScenes.length === 0) return;
    const initial: Record<string, string> = {};
    for (const sr of sceneResults) {
      const baseScene = baseScenes.find(s => s.id === sr.template_scene_id);
      const script = sr.voice_script ?? baseScene?.voice_script ?? '';
      if (script) initial[sr.id] = script;
    }
    setVoiceScripts(initial);
    voiceScriptsInitialized.current = true;
  }, [sceneResults, baseScenes]);

  // Also update thumbnails when selectedImages changes
  useEffect(() => {
    setTimelineSlotsVideo(prev =>
      prev.map(slot => {
        const entry = videoEntries[slot.entryIndex];
        if (!entry) return slot;
        const sceneId = entry.type === 'single' ? entry.scene?.id : entry.firstScene?.id;
        if (!sceneId) return slot;
        const newThumb = selectedImages[sceneId] ?? slot.thumbnailUrl;
        return { ...slot, thumbnailUrl: newThumb };
      })
    );
  }, [selectedImages, videoEntries]);

  // ── Timeline callbacks ───────────────────────────────────────────────────────

  const handleTimelineReorder = useCallback((newSlots: TimelineSlot[]) => {
    setTimelineSlotsVideo(newSlots);
  }, []);

  const handleAssignVideo = useCallback((slotIndex: number, videoUrl: string) => {
    setTimelineSlotsVideo(prev =>
      prev.map((s, i) => i === slotIndex ? { ...s, videoUrl } : s)
    );
  }, []);

  const handleTrimChange = useCallback((slotIndex: number, trimStart: number, trimEnd: number | null) => {
    setTimelineSlotsVideo(prev =>
      prev.map((s, i) => i === slotIndex ? { ...s, trimStart, trimEnd } : s)
    );
  }, []);

  const handleDurationLoaded = useCallback((slotIndex: number, duration: number) => {
    setTimelineSlotsVideo(prev =>
      prev.map((s, i) => i === slotIndex ? { ...s, duration } : s)
    );
  }, []);

  // ── Voice Over handlers ──────────────────────────────────────────────────────

  const voiceAudioUrls = useMemo<Record<number, string | null>>(() =>
    Object.fromEntries(
      timelineSlotsVideo.map((slot) => {
        const result = sceneResults.find(r => r.id === slot.sceneResultId);
        return [slot.entryIndex, result?.voice_audio_url ?? null];
      })
    ),
  [timelineSlotsVideo, sceneResults]);

  const handleVoiceScriptChange = useCallback((sceneResultId: string, value: string) => {
    setVoiceScripts(prev => ({ ...prev, [sceneResultId]: value }));
    if (voiceScriptTimers.current[sceneResultId]) {
      clearTimeout(voiceScriptTimers.current[sceneResultId]);
    }
    voiceScriptTimers.current[sceneResultId] = setTimeout(() => {
      updateSceneResult.mutate({ id: sceneResultId, voice_script: value });
    }, 500);
  }, [updateSceneResult]);

  const handleGenerateVoice = useCallback(async (sceneResultId: string) => {
    if (!template?.voice_id) return;
    const script = voiceScripts[sceneResultId] ?? '';
    if (!script.trim()) return;
    // Replace {{שם פרטי}} placeholder with the production's first name
    const resolvedScript = script.replace(/\{\{שם פרטי\}\}/g, firstName.trim() || '');
    setVoiceGenerating(prev => ({ ...prev, [sceneResultId]: true }));
    try {
      const buffer = await generateVoice(resolvedScript, template.voice_id, template.lang);
      const url = await uploadVoiceAudio(buffer, productionId, sceneResultId);
      updateSceneResult.mutate({ id: sceneResultId, voice_audio_url: url, voice_script: script });
      toast({ title: 'Voice generated successfully' });
    } catch (err) {
      toast({ title: 'Voice generation failed', description: String(err), variant: 'destructive' });
    } finally {
      setVoiceGenerating(prev => ({ ...prev, [sceneResultId]: false }));
    }
  }, [template?.voice_id, voiceScripts, firstName, productionId, updateSceneResult, toast]);

  // ── Other handlers (unchanged) ───────────────────────────────────────────────

  const handleBrandColorsChange = useCallback((colors: BrandColors) => {
    setBrandColors(colors);
    if (production) {
      updateProduction.mutate({
        id: production.id,
        brand_primary: colors.primary,
        brand_secondary: colors.secondary,
        brand_accent: colors.accent,
      });
    }
  }, [production, updateProduction]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !production) return;
    const b64 = await fileToBase64(file);
    setLogoData(b64);
    const previewUrl = `data:${b64.mime};base64,${b64.data}`;
    setLogoPreview(previewUrl);

    const ext = file.name.split('.').pop() || 'png';
    const path = `productions/${production.id}/logo.${ext}`;
    try {
      const publicUrl = await uploadGeneratedImage(b64.data, b64.mime, path);
      updateProduction.mutate({ id: production.id, logo_url: publicUrl });
    } catch {
      // Logo display still works from local preview
    }

    const colors = await extractDominantColors(previewUrl);
    if (colors.length >= 1) {
      const newColors = {
        primary: colors[0],
        secondary: colors[1] || brandColors.secondary,
        accent: brandColors.accent,
      };
      setBrandColors(newColors);
      updateProduction.mutate({
        id: production.id,
        brand_primary: newColors.primary,
        brand_secondary: newColors.secondary,
        brand_accent: newColors.accent,
      });
    }
  };

  const handleSelectImage = useCallback((sceneId: string, src: string) => {
    const result = sceneResults.find(r => r.template_scene_id === sceneId);
    if (result) updateSceneResult.mutate({ id: result.id, selected_image_url: src });
  }, [sceneResults, updateSceneResult]);

  const handleImagesGenerated = useCallback(async (sceneId: string, images: Array<{ image: string; mimeType: string }>) => {
    if (!production) return;
    const result = sceneResults.find(r => r.template_scene_id === sceneId);
    if (!result) return;
    const urls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const { image, mimeType } = images[i];
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const path = `productions/${production.id}/${sceneId}/${i}.${ext}`;
      try {
        const url = await uploadGeneratedImage(image, mimeType, path);
        urls.push(url);
      } catch { /* skip */ }
    }
    if (urls.length > 0) updateSceneResult.mutate({ id: result.id, generated_images: urls });
  }, [production, sceneResults, updateSceneResult]);

  const handleSaveRef = useCallback((src: string, sceneName: string) => {
    setSavedRef({ src, sceneName });
    toast({ title: t('admin.templates.editor.savedRef', { name: sceneName }) });
  }, [toast, t]);

  const handleUpdateScene = (sceneId: string, updates: Partial<TemplateScene>) => {
    const result = sceneResults.find(r => r.template_scene_id === sceneId);
    if (!result) return;
    const resultUpdates: Record<string, unknown> = {};
    if ('prompt' in updates) resultUpdates.prompt_override = updates.prompt;
    if ('description' in updates) resultUpdates.description_override = updates.description;
    if (Object.keys(resultUpdates).length > 0) {
      updateSceneResult.mutate({ id: result.id, ...resultUpdates });
    }
  };

  const handleDownloadAll = () => {
    Object.entries(selectedImages).forEach(([sceneId, src], idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = src;
        const scene = baseScenes.find(s => s.id === sceneId);
        link.download = `${scene?.name || `scene-${idx + 1}`}.jpg`;
        link.click();
      }, idx * 250);
    });
  };

  const timelineSlots = mergedScenes.map(m => ({
    sceneId: m.baseScene.id,
    sceneName: m.baseScene.name,
    imageSrc: selectedImages[m.baseScene.id] || null,
  }));

  const isLoading = templateLoading || scenesLoading || productionLoading || resultsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('admin.templates.production.loading')}</p>
      </div>
    );
  }

  if (!template || !production) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="rounded-full bg-muted p-4">
          <Film className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{t('admin.templates.production.notFound')}</p>
        <Button variant="outline" onClick={() => navigate(backUrl)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0 rounded-full hover:bg-primary/10"
            onClick={() => navigate(backUrl)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight truncate">{production.name}</h1>
              <Badge variant="outline" className="shrink-0 bg-background/80 backdrop-blur-sm">
                {production.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{template.name}</span>
              <span className="text-border">·</span>
              <span className="capitalize">{template.category}</span>
              <span className="text-border">·</span>
              <span>{mergedScenes.length === 1
                ? t('admin.templates.editor.sceneCount', { count: mergedScenes.length })
                : t('admin.templates.editor.sceneCount_plural', { count: mergedScenes.length })
              }</span>
            </div>
          </div>
          {logoPreview && (
            <img
              src={logoPreview}
              alt="Logo"
              className="h-12 w-12 rounded-lg border-2 border-background shadow-sm object-contain bg-background p-1"
            />
          )}
        </div>
      </div>

      {/* Brand Customization */}
      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              {t('admin.templates.editor.brand')}
            </div>
            <BrandColorPicker colors={brandColors} onChange={handleBrandColorsChange} />
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-3">
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="h-9 w-9 rounded-md border object-contain bg-background p-0.5" />
              )}
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs h-8 px-3" asChild>
                  <span><Upload className="h-3 w-3" /> {logoData ? t('admin.templates.editor.changeLogo') : t('admin.templates.editor.uploadLogo')}</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
            {template?.voice_id && (
              <>
                <div className="h-8 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-2">
                  <User2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (firstNameTimer.current) clearTimeout(firstNameTimer.current);
                      firstNameTimer.current = setTimeout(() => {
                        if (production) updateProduction.mutate({ id: production.id, first_name: e.target.value });
                      }, 500);
                    }}
                    placeholder={isRtl ? 'שם פרטי...' : 'First name...'}
                    className="h-8 w-36 text-xs rounded-full px-3"
                    dir="auto"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardContent className="p-5">
          <SceneTimeline slots={timelineSlots} onDownloadAll={handleDownloadAll} />
          <div className="mt-4 flex gap-2">
            <Button
              variant={videoMode ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => setVideoMode(!videoMode)}
              disabled={Object.keys(selectedImages).length === 0}
            >
              <Video className="h-3.5 w-3.5" />
              {videoMode ? t('admin.templates.editor.backToScenes') : t('admin.templates.editor.createVideos')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video mode */}
      {videoMode ? (
        <>
          {/* Generation cards */}
          <Card className="overflow-hidden border-border/50 shadow-sm">
            <CardContent className="p-5">
              <VideoGeneratorSection
                entries={videoEntries}
                selectedImages={selectedImages}
                videoStates={videoStates}
                onGenerate={handleGenerate}
                onCancel={cancel}
                onReset={reset}
                onGenerateAll={handleGenerateAll}
              />
            </CardContent>
          </Card>

          {/* Timeline + player */}
          <Card className="overflow-hidden border-border/50 shadow-sm">
            <CardContent className="p-5">
              <VideoTimeline
                slots={timelineSlotsVideo}
                onReorder={handleTimelineReorder}
                onAssignVideo={handleAssignVideo}
                onTrimChange={handleTrimChange}
                onDurationLoaded={handleDurationLoaded}
                bgMusicUrl={template?.bg_music_url ?? null}
                voiceAudioUrls={voiceAudioUrls}
              />
              <div className="mt-3 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-full text-xs h-8 px-4"
                  onClick={() => void exportVideo({
                    slots: timelineSlotsVideo,
                    voiceAudioUrls,
                    bgMusicUrl: template?.bg_music_url ?? null,
                    fileName: `${production.name}.mp4`,
                  })}
                  disabled={exporting || timelineSlotsVideo.filter(s => s.videoUrl).length === 0}
                >
                  {exporting
                    ? <><Loader2 className="h-3 w-3 animate-spin" /> Exporting {exportProgress}%</>
                    : <><Download className="h-3 w-3" /> Download</>}
                </Button>
                {exporting && exportProgress > 0 && exportProgress < 100 && (
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Voice Over */}
          {template?.voice_id && (
            <Card className="overflow-hidden border-border/50 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Mic2 className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold">Voice Over</h3>
                </div>
                <div className="space-y-4">
                  {videoEntries.map((entry, idx) => {
                    const sceneId = entry.type === 'single' ? entry.scene!.id : entry.firstScene!.id;
                    const result = sceneResults.find(r => r.template_scene_id === sceneId);
                    if (!result) return null;
                    const label = entry.type === 'single'
                      ? (entry.scene?.name ?? `Scene ${idx + 1}`)
                      : `${entry.firstScene?.name ?? ''} → ${entry.lastScene?.name ?? ''}`;
                    const script = voiceScripts[result.id] ?? '';
                    const isGenerating = !!voiceGenerating[result.id];
                    const audioUrl = result.voice_audio_url;
                    return (
                      <div key={result.id} className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="text-xs font-medium text-muted-foreground">{label}</div>
                        <Textarea
                          value={script}
                          onChange={(e) => handleVoiceScriptChange(result.id, e.target.value)}
                          placeholder="Enter voice script... Use [fast], [slow], [loudly], [short pause] for ElevenLabs voice tags."
                          className="text-sm min-h-[80px] resize-y"
                          dir="auto"
                        />
                        {script && /\[[^\]]+\]/.test(script) && (
                          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                            Tags like <span className="font-mono">[fast]</span>, <span className="font-mono">[short pause]</span> are ElevenLabs voice-direction markers and will be sent as-is to the API.
                          </p>
                        )}
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-7 px-3 shrink-0"
                            onClick={() => void handleGenerateVoice(result.id)}
                            disabled={isGenerating || !script.trim()}
                          >
                            {isGenerating ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                            ) : (
                              <><Mic2 className="h-3 w-3" /> Generate</>
                            )}
                          </Button>
                          {audioUrl && (
                            <audio controls src={audioUrl} className="flex-1 min-w-0" style={{ height: 28 }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Scenes mode */
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{t('admin.templates.editor.scenes')}</h2>
            <Badge variant="secondary" className="text-xs tabular-nums">
              {mergedScenes.length}
            </Badge>
          </div>

          {mergedScenes.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center gap-4 py-16">
                <div className="rounded-full bg-primary/10 p-4">
                  <Film className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground">{t('admin.templates.production.noScenes')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {mergedScenes.map((merged, idx) => {
                const virtualScene: TemplateScene = {
                  ...merged.baseScene,
                  prompt: merged.effectivePrompt,
                  description: merged.effectiveDescription,
                  reference_url: merged.effectiveReferenceUrl,
                };
                return (
                  <SceneEditor
                    key={merged.result.id}
                    scene={virtualScene}
                    index={idx}
                    brandColors={brandColors}
                    logoData={logoData}
                    logoUrl={production?.logo_url}
                    savedRef={savedRef}
                    onUpdate={(updates) => handleUpdateScene(merged.baseScene.id, updates)}
                    onDelete={() => {}}
                    onSelectImage={handleSelectImage}
                    onSaveRef={handleSaveRef}
                    onImagesGenerated={handleImagesGenerated}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
