import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Film, Plus, Search, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/hooks/useTemplates';
import { useCreateProduction } from '@/hooks/useTemplateProductions';
import { TemplateListTable } from '@/components/templates/TemplateListTable';
import { TemplateFormDialog } from '@/components/templates/TemplateFormDialog';
import { TEMPLATE_CATEGORIES, CATEGORY_LABELS } from '@/types/template';
import type { DbTemplate } from '@/types/template';

const AdminTemplates = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DbTemplate | null>(null);

  const { data: templates = [], isLoading } = useTemplates();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const createProduction = useCreateProduction();

  // Fetch meta org names for the scope column
  const { data: metaOrgNames = {} } = useQuery({
    queryKey: ['meta-org-names'],
    queryFn: async () => {
      const { data } = await supabase.from('meta_organizations').select('id, name');
      const map: Record<string, string> = {};
      data?.forEach(org => { map[org.id] = org.name; });
      return map;
    },
  });

  const filteredTemplates = templates.filter(tmpl => {
    const matchesSearch =
      tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tmpl.event_type || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || tmpl.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = async (data: Parameters<typeof createMutation.mutateAsync>[0]) => {
    try {
      const created = await createMutation.mutateAsync(data);
      setIsCreateOpen(false);
      toast({ title: t('admin.templates.created') });
      navigate(`/admin/templates/${created.id}`);
    } catch (err) {
      toast({ title: t('admin.templates.createFailed'), description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleEdit = async (data: Parameters<typeof updateMutation.mutateAsync>[0]) => {
    if (!editingTemplate) return;
    try {
      await updateMutation.mutateAsync({ id: editingTemplate.id, ...data });
      setEditingTemplate(null);
      toast({ title: t('admin.templates.updated') });
    } catch (err) {
      toast({ title: t('admin.templates.updateFailed'), description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (tmpl: DbTemplate) => {
    try {
      await updateMutation.mutateAsync({ id: tmpl.id, is_active: !tmpl.is_active });
      toast({ title: tmpl.is_active ? t('admin.templates.deactivated') : t('admin.templates.activated') });
    } catch (err) {
      toast({ title: t('admin.templates.toggleFailed'), description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleStartProduction = async (tmpl: DbTemplate) => {
    try {
      const production = await createProduction.mutateAsync({ template_id: tmpl.id });
      navigate(`/admin/templates/${tmpl.id}/productions/${production.id}`);
    } catch (err) {
      toast({ title: t('admin.templates.production.createFailed'), description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = async (tmpl: DbTemplate) => {
    if (!confirm(t('admin.templates.deleteConfirm', { name: tmpl.name }))) return;
    try {
      await deleteMutation.mutateAsync(tmpl.id);
      toast({ title: t('admin.templates.deleted') });
    } catch (err) {
      toast({ title: t('admin.templates.deleteFailed'), description: (err as Error).message, variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('admin.templates.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('admin.templates.subtitle')}</p>
          </div>
          <Button className="gap-2 rounded-full shadow-sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('admin.templates.newTemplate')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
            <Input
              placeholder={t('admin.templates.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${isRtl ? 'pr-10' : 'pl-10'} rounded-full bg-muted/30 border-border/50 focus-visible:bg-background`}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 rounded-full bg-muted/30 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.templates.allCategories')}</SelectItem>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_LABELS[cat] || cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {templates.length > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums">
              {t('admin.templates.ofCount', { filtered: filteredTemplates.length, total: templates.length })}
            </Badge>
          )}
        </div>

        {/* Content */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{t('admin.templates.loading')}</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <Film className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{t('admin.templates.noTemplates')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery || categoryFilter !== 'all'
                      ? t('admin.templates.noTemplatesHintFiltered')
                      : t('admin.templates.noTemplatesHintEmpty')}
                  </p>
                </div>
                {!searchQuery && categoryFilter === 'all' && (
                  <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="rounded-full gap-2">
                    <Sparkles className="h-4 w-4" /> {t('admin.templates.createFirst')}
                  </Button>
                )}
              </div>
            ) : (
              <TemplateListTable
                templates={filteredTemplates}
                showOrgColumn
                metaOrgNames={metaOrgNames}
                onEdit={setEditingTemplate}
                onEditScenes={(tmpl) => navigate(`/admin/templates/${tmpl.id}`)}
                onStartProduction={handleStartProduction}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>

        {/* Create dialog */}
        <TemplateFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={handleCreate}
          isPending={createMutation.isPending}
        />

        {/* Edit dialog */}
        <TemplateFormDialog
          open={!!editingTemplate}
          onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}
          template={editingTemplate}
          onSubmit={handleEdit}
          isPending={updateMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminTemplates;
