import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/hooks/useTemplates';
import { TemplateListTable } from '@/components/templates/TemplateListTable';
import { TemplateFormDialog } from '@/components/templates/TemplateFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { DbTemplate } from '@/types/template';

interface OrgTemplatesTabProps {
  metaOrgId: string;
}

export function OrgTemplatesTab({ metaOrgId }: OrgTemplatesTabProps) {
  const { metaOrganization } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useTemplates(metaOrgId);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DbTemplate | null>(null);

  // Separate system-wide (read-only) and org-owned templates
  const orgTemplates = templates.filter(t => t.meta_organization_id === metaOrgId);
  const systemTemplates = templates.filter(t => !t.meta_organization_id);

  const filteredOrg = orgTemplates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredSystem = systemTemplates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (data: any) => {
    createTemplate.mutate(
      { ...data, meta_organization_id: metaOrgId },
      {
        onSuccess: () => {
          setFormOpen(false);
          toast({ title: 'Template created' });
        },
        onError: () => toast({ title: 'Failed to create template', variant: 'destructive' }),
      }
    );
  };

  const handleEdit = (tmpl: DbTemplate) => {
    if (tmpl.meta_organization_id !== metaOrgId) return; // Can't edit system templates
    setEditingTemplate(tmpl);
    setFormOpen(true);
  };

  const handleUpdate = (data: any) => {
    if (!editingTemplate) return;
    updateTemplate.mutate(
      { id: editingTemplate.id, ...data },
      {
        onSuccess: () => {
          setFormOpen(false);
          setEditingTemplate(null);
          toast({ title: 'Template updated' });
        },
        onError: () => toast({ title: 'Failed to update template', variant: 'destructive' }),
      }
    );
  };

  const handleEditScenes = (tmpl: DbTemplate) => {
    if (tmpl.meta_organization_id !== metaOrgId) return;
    const slug = metaOrganization?.slug || '';
    navigate(`/${slug}/admin/templates/${tmpl.id}`);
  };

  const handleToggleActive = (tmpl: DbTemplate) => {
    if (tmpl.meta_organization_id !== metaOrgId) return;
    updateTemplate.mutate({ id: tmpl.id, is_active: !tmpl.is_active });
  };

  const handleDelete = (tmpl: DbTemplate) => {
    if (tmpl.meta_organization_id !== metaOrgId) return;
    if (!confirm('Delete this template? This cannot be undone.')) return;
    deleteTemplate.mutate(tmpl.id, {
      onSuccess: () => toast({ title: 'Template deleted' }),
      onError: () => toast({ title: 'Failed to delete template', variant: 'destructive' }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Org templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organization Templates</CardTitle>
              <CardDescription>Templates specific to your organization</CardDescription>
            </div>
            <Button className="gap-1.5" onClick={() => { setEditingTemplate(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filteredOrg.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No organization templates yet.</p>
            </div>
          ) : (
            <TemplateListTable
              templates={filteredOrg}
              onEdit={handleEdit}
              onEditScenes={handleEditScenes}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* System templates (read-only) */}
      {filteredSystem.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>System Templates</CardTitle>
            <CardDescription>System-wide templates available to all organizations (read-only)</CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateListTable
              templates={filteredSystem}
              onEdit={() => {}}
              onEditScenes={() => {}}
              onToggleActive={() => {}}
              onDelete={() => {}}
            />
          </CardContent>
        </Card>
      )}

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingTemplate(null); }}
        template={editingTemplate}
        metaOrgId={metaOrgId}
        onSubmit={editingTemplate ? handleUpdate : handleCreate}
        isPending={createTemplate.isPending || updateTemplate.isPending}
      />
    </div>
  );
}
