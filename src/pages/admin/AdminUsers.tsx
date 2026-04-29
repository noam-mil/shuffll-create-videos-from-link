import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MoreHorizontal, Shield, Building2, User, Users, Loader2, Plus, KeyRound } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { APP_ROLES, ORG_ROLES, AnyRole, ROLE_TRANSLATION_KEYS } from '@/types/roles';
import { supabase } from '@/integrations/supabase/client';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AnyRole;
  org_name: string;
  org_id: string;
}

const AdminUsers = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const queryClient = useQueryClient();

  // Fetch meta org admins from database
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async (): Promise<UserWithRole[]> => {
      const { data: memberships, error } = await supabase
        .from('meta_organization_memberships')
        .select(`
          id,
          user_id,
          role,
          meta_organization:meta_organizations(id, name)
        `);

      if (error) throw error;
      if (!memberships || memberships.length === 0) return [];

      const userIds = [...new Set(memberships.map(m => m.user_id))];

      // Fetch profiles and emails in parallel
      const [profilesResult, emailsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds),
        supabase.functions.invoke('list-user-emails', {
          body: { user_ids: userIds },
        }),
      ]);

      const profileMap = new Map(
        profilesResult.data?.map(p => [p.user_id, p]) || []
      );
      const emailMap: Record<string, string> = emailsResult.data?.emails || {};

      return memberships.map(m => {
        const profile = profileMap.get(m.user_id);
        const metaOrg = m.meta_organization as { id: string; name: string } | null;
        
        return {
          id: m.id,
          user_id: m.user_id,
          email: emailMap[m.user_id] || '',
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          role: m.role as AnyRole,
          org_name: metaOrg?.name || 'Unknown',
          org_id: metaOrg?.id || '',
        };
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (membership: UserWithRole) => {
      const { error } = await supabase
        .from('meta_organization_memberships')
        .delete()
        .eq('id', membership.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('admin.usersPage.userDeleted', 'User removed successfully'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const handleEdit = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDelete = (user: UserWithRole) => {
    if (confirm(t('admin.usersPage.deleteConfirm', 'Are you sure you want to remove this user?'))) {
      deleteUserMutation.mutate(user);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.org_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: AnyRole) => {
    const translationKey = ROLE_TRANSLATION_KEYS[role];
    const label = t(translationKey);
    const iconMargin = isRtl ? 'ml-1' : 'mr-1';

    switch (role) {
      case APP_ROLES.SYSTEM_ADMIN:
        return (
          <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
            <Shield className={`w-3 h-3 ${iconMargin}`} />
            {label}
          </Badge>
        );
      case ORG_ROLES.META_ORG_ADMIN:
        return (
          <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
            <Users className={`w-3 h-3 ${iconMargin}`} />
            {label}
          </Badge>
        );
      case ORG_ROLES.ORG_ADMIN:
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Building2 className={`w-3 h-3 ${iconMargin}`} />
            {label}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <User className={`w-3 h-3 ${iconMargin}`} />
            {label}
          </Badge>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('admin.usersPage.title')}</h1>
            <p className="text-muted-foreground">{t('admin.usersPage.subtitle')}</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            {t('admin.usersPage.createUser', 'Create User')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('admin.users')}</CardTitle>
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
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('common.noResults', 'No users found')}
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.usersPage.name')}</TableHead>
                  <TableHead>{t('admin.usersPage.email')}</TableHead>
                  <TableHead>{t('admin.usersPage.organization')}</TableHead>
                  <TableHead>{t('admin.usersPage.role')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(user.full_name || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name || t('common.unnamed', 'Unnamed')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground" dir="ltr">{user.email || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span>{user.org_name}</span>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setResetPasswordDialogOpen(true); }}>
                            <KeyRound className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                            {t('admin.usersPage.resetPassword', 'Reset Password')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(user)}
                          >
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>

        <CreateUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        <EditUserDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} user={selectedUser} />
        <ResetPasswordDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen} user={selectedUser} />
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
