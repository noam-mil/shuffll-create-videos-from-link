import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Plus, Search, Edit, Trash2, Eye, Loader2, Users, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Organization } from '@/types/organization';
import { OrgMembersDialog } from './OrgMembersDialog';

interface OrganizationsTabProps {
  metaOrgId: string;
  metaOrgSlug: string;
}

interface OrgForm {
  name: string;
  is_active: boolean;
}

export const OrganizationsTab = ({ metaOrgId, metaOrgSlug }: OrganizationsTabProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState<OrgForm>({
    name: '',
    is_active: true,
  });

  // Fetch organizations
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations', metaOrgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('meta_organization_id', metaOrgId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Organization[];
    },
  });

  // Fetch member counts per org
  const { data: memberCounts = {} } = useQuery({
    queryKey: ['org_member_counts', metaOrgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_memberships')
        .select('organization_id');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(membership => {
        if (membership.organization_id) {
          counts[membership.organization_id] = (counts[membership.organization_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (org: OrgForm) => {
      // Generate a unique slug from the name
      const baseSlug = org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const slug = `${baseSlug}-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          meta_organization_id: metaOrgId,
          name: org.name,
          slug: slug,
          is_active: org.is_active,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', metaOrgId] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: t('org.admin.orgs.createSuccess') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('org.admin.orgs.createError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, ...org }: OrgForm & { id: string }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: org.name,
          is_active: org.is_active,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', metaOrgId] });
      setIsEditDialogOpen(false);
      setSelectedOrg(null);
      resetForm();
      toast({ title: t('org.admin.orgs.updateSuccess') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('org.admin.orgs.updateError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', metaOrgId] });
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

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', metaOrgId] });
      queryClient.invalidateQueries({ queryKey: ['org_member_counts', metaOrgId] });
      toast({ title: t('org.admin.orgs.deleteSuccess') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('org.admin.orgs.deleteError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      is_active: true,
    });
  };

  const handleCreateOrg = () => {
    if (!formData.name) {
      toast({ 
        title: t('admin.metaOrgs.fillRequired'), 
        variant: 'destructive' 
      });
      return;
    }
    createOrgMutation.mutate(formData);
  };

  const handleEditOrg = () => {
    if (!selectedOrg || !formData.name) {
      toast({ 
        title: t('admin.metaOrgs.fillRequired'), 
        variant: 'destructive' 
      });
      return;
    }
    updateOrgMutation.mutate({ id: selectedOrg.id, ...formData });
  };

  const openEditDialog = (org: Organization) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      is_active: org.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (org: Organization) => {
    setSelectedOrg(org);
    setIsViewDialogOpen(true);
  };

  const openMembersDialog = (org: Organization) => {
    setSelectedOrg(org);
    setIsMembersDialogOpen(true);
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formFieldsJsx = (
    <div className="grid gap-6 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('org.admin.orgs.orgName')}</Label>
        <Input 
          id="name" 
          placeholder={t('admin.metaOrgs.orgNamePlaceholder')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('org.admin.orgs.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('org.admin.orgs.createDescription')}
            </DialogDescription>
          </DialogHeader>
          {formFieldsJsx}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateOrg} disabled={createOrgMutation.isPending}>
              {createOrgMutation.isPending && <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />}
              {t('org.admin.orgs.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('org.admin.orgs.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('org.admin.orgs.editDescription')}
            </DialogDescription>
          </DialogHeader>
          {formFieldsJsx}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditOrg} disabled={updateOrgMutation.isPending}>
              {updateOrgMutation.isPending && <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />}
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
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              {selectedOrg?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('common.status')}</Label>
                  <div className="mt-1">
                    <Badge variant={selectedOrg.is_active ? 'default' : 'secondary'}>
                      {selectedOrg.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('org.admin.orgs.membersCount')}</Label>
                  <p className="text-sm mt-1">{memberCounts[selectedOrg.id] || 0} {t('org.admin.orgs.members')}</p>
                </div>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <OrgMembersDialog
        organization={selectedOrg}
        metaOrgId={metaOrgId}
        isOpen={isMembersDialogOpen}
        onClose={() => { setIsMembersDialogOpen(false); setSelectedOrg(null); }}
      />

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t('org.admin.orgs.title')}
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={isRtl ? 'pr-10' : 'pl-10'}
                />
              </div>
              <Button className="gap-2" onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                <Plus className="w-4 h-4" />
                {t('org.admin.orgs.newOrg')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('org.admin.orgs.noOrgs')}</p>
              <p className="text-sm">{t('org.admin.orgs.noOrgsHint')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('org.admin.orgs.orgName')}</TableHead>
                  <TableHead>{t('org.admin.orgs.membersCount')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{memberCounts[org.id] || 0}</span>
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openMembersDialog(org)} 
                          title={t('org.admin.orgs.manageMembers')}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openViewDialog(org)} title={t('common.view')}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(org)} title={t('common.edit')}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(t('org.admin.orgs.deleteConfirmDesc', { name: org.name }))) {
                              deleteOrgMutation.mutate(org.id);
                            }
                          }}
                          disabled={deleteOrgMutation.isPending}
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
  );
};
