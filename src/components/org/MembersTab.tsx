import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Plus, Search, Edit, Trash2, Loader2, Building2, User, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MembersTabProps {
  metaOrgId: string;
}

type OrgRole = 'meta_org_admin' | 'org_admin' | 'user';

interface MemberWithProfile {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    email?: string;
  } | null;
}

export const MembersTab = ({ metaOrgId }: MembersTabProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('user');
  const [editRole, setEditRole] = useState<OrgRole>('user');

  // Fetch members with their profiles
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['meta-org-members', metaOrgId],
    queryFn: async () => {
      // First get memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('meta_organization_memberships')
        .select('*')
        .eq('meta_organization_id', metaOrgId)
        .order('created_at', { ascending: false });
      
      if (membershipError) throw membershipError;
      if (!memberships || memberships.length === 0) return [];

      // Then get profiles for those users
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);
      
      if (profileError) throw profileError;

      // Combine the data
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return memberships.map(m => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role as OrgRole,
        created_at: m.created_at,
        profile: profileMap.get(m.user_id) || null
      })) as MemberWithProfile[];
    },
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: string; role: OrgRole }) => {
      const { error } = await supabase
        .from('meta_organization_memberships')
        .update({ role })
        .eq('id', membershipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-org-members', metaOrgId] });
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      toast({ title: t('org.admin.members.roleUpdated') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('org.admin.members.roleUpdateError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('meta_organization_memberships')
        .delete()
        .eq('id', membershipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-org-members', metaOrgId] });
      toast({ title: t('org.admin.members.removed') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('org.admin.members.removeError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Invite member mutation (adds existing user by email)
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: OrgRole }) => {
      // First, find the user by checking profiles (we need to find user_id from email)
      // Since we can't directly query auth.users, we'll need a different approach
      // For now, we'll show an error and explain the limitation
      throw new Error('User lookup by email requires an edge function. Please use the system admin panel to add users.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-org-members', metaOrgId] });
      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
      toast({ title: t('org.admin.members.invited') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('org.admin.members.inviteError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const openEditDialog = (member: MemberWithProfile) => {
    setSelectedMember(member);
    setEditRole(member.role);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (selectedMember) {
      updateRoleMutation.mutate({ membershipId: selectedMember.id, role: editRole });
    }
  };

  const handleRemoveMember = (member: MemberWithProfile) => {
    if (confirm(t('org.admin.members.removeConfirm', { name: member.profile?.full_name || 'this user' }))) {
      removeMemberMutation.mutate(member.id);
    }
  };

  const filteredMembers = members.filter(member =>
    member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    member.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: OrgRole) => {
    switch (role) {
      case 'meta_org_admin':
        return <Crown className="w-3 h-3" />;
      case 'org_admin':
        return <Building2 className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const getRoleVariant = (role: OrgRole): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'meta_org_admin':
        return 'default';
      case 'org_admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('org.admin.members.inviteTitle')}</DialogTitle>
            <DialogDescription>
              {t('org.admin.members.inviteDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('org.admin.members.role')}</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('roles.user')}</SelectItem>
                  <SelectItem value="org_admin">{t('roles.orgAdmin')}</SelectItem>
                  <SelectItem value="meta_org_admin">{t('roles.metaOrgAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={() => inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={inviteMemberMutation.isPending || !inviteEmail}
            >
              {inviteMemberMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t('org.admin.members.invite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('org.admin.members.editRoleTitle')}</DialogTitle>
            <DialogDescription>
              {t('org.admin.members.editRoleDescription', { name: selectedMember?.profile?.full_name || 'User' })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>{t('org.admin.members.role')}</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as OrgRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('roles.user')}</SelectItem>
                  <SelectItem value="org_admin">{t('roles.orgAdmin')}</SelectItem>
                  <SelectItem value="meta_org_admin">{t('roles.metaOrgAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('org.admin.members.title')}
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
              <Button className="gap-2" onClick={() => setIsInviteDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                {t('org.admin.members.invite')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('org.admin.members.noMembers')}</p>
              <p className="text-sm">{t('org.admin.members.noMembersHint')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('org.admin.members.member')}</TableHead>
                  <TableHead>{t('org.admin.members.role')}</TableHead>
                  <TableHead>{t('org.admin.members.joinedAt')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.profile?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium block">
                            {member.profile?.full_name || t('org.admin.members.unknownUser')}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {member.user_id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleVariant(member.role)} className="gap-1">
                        {getRoleIcon(member.role)}
                        {t(`roles.${member.role === 'meta_org_admin' ? 'metaOrgAdmin' : member.role === 'org_admin' ? 'orgAdmin' : 'user'}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString(i18n.language)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditDialog(member)} 
                          title={t('org.admin.members.editRole')}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member)}
                          disabled={removeMemberMutation.isPending}
                          title={t('org.admin.members.remove')}
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
