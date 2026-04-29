import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Film, Loader2, Layers } from 'lucide-react';
import { useTemplate } from '@/hooks/useTemplates';
import { useTemplateScenes, useCreateScene, useUpdateScene, useDeleteScene } from '@/hooks/useTemplateScenes';
import { BaseSceneEditor } from '@/components/templates/BaseSceneEditor';
import { useToast } from '@/hooks/use-toast';
import type { TemplateScene } from '@/types/template';

const AdminTemplateScenes = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { toast } = useToast();

  const { data: template, isLoading: templateLoading } = useTemplate(templateId);
  const { data: scenes = [], isLoading: scenesLoading } = useTemplateScenes(templateId);
  const createScene = useCreateScene();
  const updateScene = useUpdateScene();
  const deleteScene = useDeleteScene();

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
    } catch {
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
        {/* Header */}
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
                  {t('admin.templates.baseScenes.title')}
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
          </div>
        </div>

        {/* Scenes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t('admin.templates.baseScenes.heading')}</h2>
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
                    {t('admin.templates.baseScenes.noScenesHint')}
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
                <BaseSceneEditor
                  key={scene.id}
                  scene={scene}
                  index={idx}
                  onUpdate={(updates) => handleUpdateScene(scene.id, updates)}
                  onDelete={() => handleDeleteScene(scene.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTemplateScenes;
