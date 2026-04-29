import { useState } from 'react';
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
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ORG_ROLES, ROLE_TRANSLATION_KEYS, OrgRole } from '@/types/roles';
import { toast } from 'sonner';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateUserDialog = ({ open, onOpenChange }: CreateUserDialogProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he';
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [metaOrgId, setMetaOrgId] = useState('');
  const [role, setRole] = useState<OrgRole>(ORG_ROLES.USER);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch meta organizations for dropdown
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

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('create-admin-user', {
        body: {
          email,
          password,
          full_name: fullName,
          meta_organization_id: metaOrgId || null,
          role: metaOrgId ? role : null,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      return response.data;
    },
    onSuccess: () => {
      toast.success(t('admin.usersPage.userCreated', 'User created successfully'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error', 'An error occurred'));
    },
  });

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setMetaOrgId('');
    setRole(ORG_ROLES.USER);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate();
  };

  const availableRoles: OrgRole[] = [
    ORG_ROLES.META_ORG_ADMIN,
    ORG_ROLES.ORG_ADMIN,
    ORG_ROLES.USER,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRtl ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t('admin.usersPage.createUser', 'Create User')}</DialogTitle>
          <DialogDescription>
            {t('admin.usersPage.createUserDesc', 'Create a new user with initial password and organization assignment')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('auth.fullName')}</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('auth.fullName')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={isRtl ? 'pl-10' : 'pr-10'}
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`absolute ${isRtl ? 'left-1' : 'right-1'} top-1/2 -translate-y-1/2 h-7 w-7`}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaOrg">{t('admin.usersPage.organization')}</Label>
            <Select value={metaOrgId} onValueChange={setMetaOrgId}>
              <SelectTrigger>
                <SelectValue placeholder={t('admin.usersPage.selectOrg', 'Select organization')} />
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

          {metaOrgId && (
            <div className="space-y-2">
              <Label htmlFor="role">{t('admin.usersPage.role')}</Label>
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
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />
                  {t('common.loading')}
                </>
              ) : (
                t('common.add')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
