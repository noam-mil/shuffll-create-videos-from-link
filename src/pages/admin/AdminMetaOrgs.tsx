import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Search, Edit, Trash2, Eye, Loader2, Layers, ExternalLink, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MetaOrganization } from '@/types/organization';

interface MetaOrgForm {
  name: string;
  slug: string;
  custom_domain: string;
  is_active: boolean;
}

const AdminMetaOrgs = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<MetaOrganization | null>(null);
  const [formData, setFormData] = useState<MetaOrgForm>({
    name: '',
    slug: '',
    custom_domain: '',
    is_active: true,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch meta organizations with sub-org count
  const { data: metaOrgs = [], isLoading } = useQuery({
    queryKey: ['meta_organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MetaOrganization[];
    },
  });

  // Fetch organization counts per meta org
  const { data: orgCounts = {} } = useQuery({
    queryKey: ['meta_org_counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('meta_organization_id');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(org => {
        if (org.meta_organization_id) {
          counts[org.meta_organization_id] = (counts[org.meta_organization_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Create meta organization mutation
  const createMetaOrgMutation = useMutation({
    mutationFn: async (org: MetaOrgForm) => {
      const { data, error } = await supabase
        .from('meta_organizations')
        .insert({
          name: org.name,
          slug: org.slug,
          custom_domain: org.custom_domain || null,
          is_active: org.is_active,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta_organizations'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: t('admin.metaOrgs.createSuccess') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('admin.metaOrgs.createError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Update meta organization mutation
  const updateMetaOrgMutation = useMutation({
    mutationFn: async ({ id, ...org }: MetaOrgForm & { id: string }) => {
      const { data, error } = await supabase
        .from('meta_organizations')
        .update({
          name: org.name,
          slug: org.slug,
          custom_domain: org.custom_domain || null,
          is_active: org.is_active,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta_organizations'] });
      setIsEditDialogOpen(false);
      setSelectedOrg(null);
      resetForm();
      toast({ title: t('admin.metaOrgs.updateSuccess') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('admin.metaOrgs.updateError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('meta_organizations')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta_organizations'] });
      toast({ title: t('admin.metaOrgs.statusUpdated') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('common.error'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Delete meta organization mutation
  const deleteMetaOrgMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meta_organizations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta_organizations'] });
      queryClient.invalidateQueries({ queryKey: ['meta_org_counts'] });
      toast({ title: t('admin.metaOrgs.deleteSuccess') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('admin.metaOrgs.deleteError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      custom_domain: '',
      is_active: true,
    });
  };

  const handleCreateOrg = () => {
    if (!formData.name || !formData.slug) {
      toast({ 
        title: t('admin.metaOrgs.fillRequired'), 
        variant: 'destructive' 
      });
      return;
    }
    createMetaOrgMutation.mutate(formData);
  };

  const handleEditOrg = () => {
    if (!selectedOrg || !formData.name || !formData.slug) {
      toast({ 
        title: t('admin.metaOrgs.fillRequired'), 
        variant: 'destructive' 
      });
      return;
    }
    updateMetaOrgMutation.mutate({ id: selectedOrg.id, ...formData });
  };

  const openEditDialog = (org: MetaOrganization) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      slug: org.slug,
      custom_domain: org.custom_domain || '',
      is_active: org.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (org: MetaOrganization) => {
    setSelectedOrg(org);
    setIsViewDialogOpen(true);
  };

  const filteredMetaOrgs = metaOrgs.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const OrgFormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-6 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('admin.metaOrgs.orgName')}</Label>
          <Input 
            id="name" 
            placeholder={t('admin.metaOrgs.orgNamePlaceholder')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">{t('admin.metaOrgs.urlId')}</Label>
          <Input 
            id="slug" 
            placeholder="my-company" 
            dir="ltr" 
            className="text-left"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            disabled={isEdit}
          />
          {isEdit && (
            <p className="text-xs text-muted-foreground">{t('admin.metaOrgs.slugCannotChange')}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="domain">{t('admin.metaOrgs.customDomain')}</Label>
        <Input 
          id="domain" 
          placeholder="platform.company.com" 
          dir="ltr" 
          className="text-left"
          value={formData.custom_domain}
          onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>{t('common.status')}</Label>
          <p className="text-sm text-muted-foreground">{t('admin.metaOrgs.statusDescription')}</p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          {t('admin.metaOrgs.brandingNote')}
        </p>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t('admin.metaOrgs.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('admin.metaOrgs.description')}
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => resetForm()}>
                <Plus className="w-4 h-4" />
                {t('admin.metaOrgs.newMetaOrg')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
              <DialogHeader>
                <DialogTitle>{t('admin.metaOrgs.createTitle')}</DialogTitle>
                <DialogDescription>
                  {t('admin.metaOrgs.createDescription')}
                </DialogDescription>
              </DialogHeader>
              <OrgFormFields />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateOrg} disabled={createMetaOrgMutation.isPending}>
                  {createMetaOrgMutation.isPending && <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />}
                  {t('admin.metaOrgs.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle>{t('admin.metaOrgs.editTitle')}</DialogTitle>
              <DialogDescription>
                {t('admin.metaOrgs.editDescription')}
              </DialogDescription>
            </DialogHeader>
            <OrgFormFields isEdit />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleEditOrg} disabled={updateMetaOrgMutation.isPending}>
                {updateMetaOrgMutation.isPending && <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg" dir={isRtl ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                {selectedOrg?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedOrg && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('admin.metaOrgs.urlId')}</Label>
                    <p className="font-mono text-sm mt-1">{selectedOrg.slug}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('common.status')}</Label>
                    <div className="mt-1">
                      <Badge variant={selectedOrg.is_active ? 'default' : 'secondary'}>
                        {selectedOrg.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('admin.metaOrgs.customDomain')}</Label>
                  <p className="font-mono text-sm mt-1">{selectedOrg.custom_domain || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('admin.metaOrgs.subOrgsCount')}</Label>
                  <p className="text-sm mt-1">{orgCounts[selectedOrg.id] || 0} {t('admin.metaOrgs.organizations')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('common.createdAt')}</Label>
                  <p className="text-sm mt-1">{new Date(selectedOrg.created_at).toLocaleDateString(i18n.language)}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                {t('common.close')}
              </Button>
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                if (selectedOrg) navigate(`/${selectedOrg.slug}`);
              }}>
                <ExternalLink className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                {t('admin.metaOrgs.goToOrg')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                {t('admin.metaOrgs.allMetaOrgs')}
              </CardTitle>
              <div className="relative w-64">
                <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={isRtl ? 'pr-10' : 'pl-10'}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMetaOrgs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('admin.metaOrgs.noMetaOrgs')}</p>
                <p className="text-sm">{t('admin.metaOrgs.noMetaOrgsHint')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.metaOrgs.organization')}</TableHead>
                    <TableHead>{t('admin.metaOrgs.subdomain')}</TableHead>
                    <TableHead>{t('admin.metaOrgs.subOrgsCount')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMetaOrgs.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium">{org.name}</span>
                            {org.custom_domain && (
                              <p className="text-xs text-muted-foreground">{org.custom_domain}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">{org.slug}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{orgCounts[org.id] || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={org.is_active}
                          onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: org.id, is_active: checked })}
                          disabled={toggleActiveMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openViewDialog(org)} title={t('common.view')}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(org)} title={t('common.edit')}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Link to={`/${org.slug}`}>
                            <Button variant="ghost" size="icon" title={t('admin.metaOrgs.goToOrg')}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(t('admin.metaOrgs.deleteConfirm'))) {
                                deleteMetaOrgMutation.mutate(org.id);
                              }
                            }}
                            disabled={deleteMetaOrgMutation.isPending}
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminMetaOrgs;
