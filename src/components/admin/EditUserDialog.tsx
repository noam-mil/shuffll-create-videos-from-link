import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ORG_ROLES, ROLE_TRANSLATION_KEYS, OrgRole } from '@/types/roles';
import { toast } from 'sonner';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    user_id: string;
    full_name: string | null;
    role: string;
    org_id: string;
    org_name: string;
  } | null;
}

export const EditUserDialog = ({ open, onOpenChange, user }: EditUserDialogProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [metaOrgId, setMetaOrgId] = useState('');
  const [role, setRole] = useState<OrgRole>(ORG_ROLES.USER);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setMetaOrgId(user.org_id);
      setRole(user.role as OrgRole);
    }
  }, [user]);

  const { data: metaOrgs = [] } = useQuery({
    queryKey: ['meta-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_organizations')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user selected');

      // Update profile name
      if (fullName !== (user.full_name || '')) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('user_id', user.user_id);
        if (profileError) throw profileError;
      }

      // Update membership (role and/or org)
      const updates: Record<string, unknown> = {};
      if (role !== user.role) updates.role = role;
      if (metaOrgId !== user.org_id) updates.meta_organization_id = metaOrgId;

      if (Object.keys(updates).length > 0) {
        const { error: membershipError } = await supabase
          .from('meta_organization_memberships')
          .update(updates)
          .eq('id', user.id);
        if (membershipError) throw membershipError;
      }
    },
    onSuccess: () => {
      toast.success(t('admin.usersPage.userUpdated', 'User updated successfully'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const availableRoles: OrgRole[] = [
    ORG_ROLES.META_ORG_ADMIN,
    ORG_ROLES.ORG_ADMIN,
    ORG_ROLES.USER,
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRtl ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t('admin.usersPage.editUser', 'Edit User')}</DialogTitle>
          <DialogDescription>
            {t('admin.usersPage.editUserDesc', 'Update user details, role and organization')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editFullName">{t('auth.fullName')}</Label>
            <Input
              id="editFullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('auth.fullName')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editMetaOrg">{t('admin.usersPage.organization')}</Label>
            <Select value={metaOrgId} onValueChange={setMetaOrgId}>
              <SelectTrigger>
                <SelectValue placeholder={t('admin.usersPage.selectOrg')} />
              </SelectTrigger>
              <SelectContent>
                {metaOrgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editRole">{t('admin.usersPage.role')}</Label>
            <Select value={role} onValueChange={(val) => setRole(val as OrgRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(ROLE_TRANSLATION_KEYS[r])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />
                  {t('common.loading')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
