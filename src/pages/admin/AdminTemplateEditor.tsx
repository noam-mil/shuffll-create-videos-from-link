import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Film, Loader2, Upload, Video, Sparkles, Layers } from 'lucide-react';
import { useTemplate, useUpdateTemplate } from '@/hooks/useTemplates';
import { useTemplateScenes, useCreateScene, useUpdateScene, useDeleteScene } from '@/hooks/useTemplateScenes';
import { BrandColorPicker } from '@/components/templates/BrandColorPicker';
import { SceneEditor } from '@/components/templates/SceneEditor';
import { SceneTimeline } from '@/components/templates/SceneTimeline';
import { VideoGeneratorSection } from '@/components/templates/VideoGeneratorSection';
import { useToast } from '@/hooks/use-toast';
import { fileToBase64, extractDominantColors } from '@/hooks/useImageGeneration';
import type { BrandColors, TemplateScene } from '@/types/template';

const AdminTemplateEditor = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { toast } = useToast();

  const { data: template, isLoading: templateLoading } = useTemplate(templateId);
  const { data: scenes = [], isLoading: scenesLoading } = useTemplateScenes(templateId);
  const updateTemplate = useUpdateTemplate();
  const createScene = useCreateScene();
  const updateScene = useUpdateScene();
  const deleteScene = useDeleteScene();

  const [brandColors, setBrandColors] = useState<BrandColors>({
    primary: '#888888',
    secondary: '#444444',
    accent: '#222222',
  });
  const [logoData, setLogoData] = useState<{ data: string; mime: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Record<string, string>>({});
  const [savedRef, setSavedRef] = useState<{ src: string; sceneName: string } | null>(null);
  const [videoMode, setVideoMode] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setLogoData(b64);
    const previewUrl = `data:${b64.mime};base64,${b64.data}`;
    setLogoPreview(previewUrl);

    const colors = await extractDominantColors(previewUrl);
    if (colors.length >= 1) {
      setBrandColors(prev => ({
        ...prev,
        primary: colors[0],
        secondary: colors[1] || prev.secondary,
      }));
    }
  };

  const handleSelectImage = useCallback((sceneId: string, src: string) => {
    setSelectedImages(prev => ({ ...prev, [sceneId]: src }));
  }, []);

  const handleSaveRef = useCallback((src: string, sceneName: string) => {
    setSavedRef({ src, sceneName });
    toast({ title: t('admin.templates.editor.savedRef', { name: sceneName }) });
  }, [toast, t]);

  const handleAddScene = async () => {
    if (!templateId) return;
    const nextOrder = scenes.length;
    try {
      await createScene.mutateAsync({
        template_id: templateId,
        name: `Scene ${nextOrder + 1}`,
        scene_order: nextOrder,
        reference_url: null,
        prompt: '',
        description: null,
        video_prompt: null,
        scene_type: 'single',
        auto_select: false,
      });
    } catch (err) {
      toast({ title: t('admin.templates.editor.addSceneFailed'), variant: 'destructive' });
    }
  };

  const handleUpdateScene = (sceneId: string, updates: Partial<TemplateScene>) => {
    updateScene.mutate({ id: sceneId, ...updates });
  };

  const handleDeleteScene = (sceneId: string) => {
    if (!templateId) return;
    if (!confirm(t('admin.templates.editor.deleteSceneConfirm'))) return;
    deleteScene.mutate({ id: sceneId, templateId });
  };

  const handleDownloadAll = () => {
    Object.entries(selectedImages).forEach(([sceneId, src], idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = src;
        const scene = scenes.find(s => s.id === sceneId);
        link.download = `${scene?.name || `scene-${idx + 1}`}.jpg`;
        link.click();
      }, idx * 250);
    });
  };

  // Build video entries from scenes
  const videoEntries = scenes.reduce<Array<{
    type: 'single' | 'pair';
    scene?: TemplateScene;
    firstScene?: TemplateScene;
    lastScene?: TemplateScene;
  }>>((acc, scene, idx) => {
    if (scene.scene_type === 'first_frame' && scenes[idx + 1]?.scene_type === 'last_frame') {
      acc.push({ type: 'pair', firstScene: scene, lastScene: scenes[idx + 1] });
    } else if (scene.scene_type === 'last_frame' && scenes[idx - 1]?.scene_type === 'first_frame') {
      // Skip — already paired above
    } else {
      acc.push({ type: 'single', scene });
    }
    return acc;
  }, []);

  const timelineSlots = scenes.map(s => ({
    sceneId: s.id,
    sceneName: s.name,
    imageSrc: selectedImages[s.id] || null,
  }));

  const isLoading = templateLoading || scenesLoading;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('admin.templates.editor.loadingTemplate')}</p>
        </div>
      </AdminLayout>
    );
  }

  if (!template) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="rounded-full bg-muted p-4">
            <Film className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">{t('admin.templates.editor.notFound')}</p>
          <Button variant="outline" onClick={() => navigate('/admin/templates')}>
            <ArrowLeft className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {t('admin.templates.editor.backToTemplates')}
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 shrink-0 rounded-full hover:bg-primary/10"
              onClick={() => navigate('/admin/templates')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight truncate">{template.name}</h1>
                <Badge variant="outline" className="shrink-0 bg-background/80 backdrop-blur-sm">
                  {template.realism || t('admin.templates.editor.anyStyle')}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="capitalize">{template.category}</span>
                <span className="text-border">·</span>
                <span>{template.lang.toUpperCase()}</span>
                <span className="text-border">·</span>
                <span>{scenes.length === 1 ? t('admin.templates.editor.sceneCount', { count: scenes.length }) : t('admin.templates.editor.sceneCount_plural', { count: scenes.length })}</span>
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

        {/* Brand Customization — Compact inline */}
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                {t('admin.templates.editor.brand')}
              </div>
              <BrandColorPicker colors={brandColors} onChange={setBrandColors} />
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

        {/* Video mode or Scenes */}
        {videoMode ? (
          <Card className="overflow-hidden border-border/50 shadow-sm">
            <CardContent className="p-5">
              <VideoGeneratorSection entries={videoEntries} selectedImages={selectedImages} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">{t('admin.templates.editor.scenes')}</h2>
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {scenes.length}
                </Badge>
              </div>
              <Button
                size="sm"
                className="gap-1.5 rounded-full shadow-sm"
                onClick={handleAddScene}
                disabled={createScene.isPending}
              >
                {createScene.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {t('admin.templates.editor.addScene')}
              </Button>
            </div>

            {scenes.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center gap-4 py-16">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Film className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{t('admin.templates.editor.noScenes')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('admin.templates.editor.noScenesHint')}
                    </p>
                  </div>
                  <Button onClick={handleAddScene} disabled={createScene.isPending} className="rounded-full gap-2">
                    <Plus className="h-4 w-4" /> {t('admin.templates.editor.addFirstScene')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {scenes.map((scene, idx) => (
                  <SceneEditor
                    key={scene.id}
                    scene={scene}
                    index={idx}
                    brandColors={brandColors}
                    logoData={logoData}
                    savedRef={savedRef}
                    onUpdate={(updates) => handleUpdateScene(scene.id, updates)}
                    onDelete={() => handleDeleteScene(scene.id)}
                    onSelectImage={handleSelectImage}
                    onSaveRef={handleSaveRef}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTemplateEditor;
