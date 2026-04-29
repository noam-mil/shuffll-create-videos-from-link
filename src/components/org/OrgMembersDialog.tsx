import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Plus, Trash2, Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Organization } from '@/types/organization';

interface OrgMembersDialogProps {
  organization: Organization | null;
  metaOrgId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface MemberWithProfile {
  id: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface MetaOrgMember {
  user_id: string;
  role: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const OrgMembersDialog = ({ organization, metaOrgId, isOpen, onClose }: OrgMembersDialogProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Fetch current organization members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['org_members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data: memberships, error } = await supabase
        .from('organization_memberships')
        .select('*')
        .eq('organization_id', organization.id);
      
      if (error) throw error;
      
      if (!memberships || memberships.length === 0) return [];
      
      // Fetch profiles for all members
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return memberships.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || null
      })) as MemberWithProfile[];
    },
    enabled: !!organization?.id && isOpen,
  });

  // Fetch meta org members (potential users to add)
  const { data: metaOrgMembers = [] } = useQuery({
    queryKey: ['meta_org_members_for_add', metaOrgId],
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from('meta_organization_memberships')
        .select('user_id, role')
        .eq('meta_organization_id', metaOrgId);
      
      if (error) throw error;
      
      if (!memberships || memberships.length === 0) return [];
      
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return memberships.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || null
      })) as MetaOrgMember[];
    },
    enabled: isOpen,
  });

  // Filter out users who are already members
  const availableUsers = metaOrgMembers.filter(
    metaMember => !members.some(m => m.user_id === metaMember.user_id)
  );

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!organization?.id) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('organization_memberships')
        .insert({
          organization_id: organization.id,
          user_id: userId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org_members', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['org_member_counts'] });
      setSelectedUserId('');
      setIsAddingMember(false);
      toast({ title: t('org.admin.orgs.memberAdded') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('org.admin.orgs.memberAddError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('organization_memberships')
        .delete()
        .eq('id', membershipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org_members', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['org_member_counts'] });
      toast({ title: t('org.admin.orgs.memberRemoved') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('org.admin.orgs.memberRemoveError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAddMember = () => {
    if (selectedUserId) {
      addMemberMutation.mutate(selectedUserId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" dir={isRtl ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            {t('org.admin.orgs.manageMembers')}
          </DialogTitle>
          <DialogDescription>
            {t('org.admin.orgs.manageMembersDesc', { name: organization?.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add member section */}
          {isAddingMember ? (
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('org.admin.orgs.selectUser')} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {availableUsers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {t('org.admin.orgs.noAvailableUsers')}
                    </div>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        <div className="flex items-center gap-2">
                          <span>{user.profile?.full_name || t('org.admin.members.unknownUser')}</span>
                          <Badge variant="outline" className="text-xs">
                            {t(`roles.${user.role === 'meta_org_admin' ? 'metaOrgAdmin' : user.role === 'org_admin' ? 'orgAdmin' : 'user'}`)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={handleAddMember}
                disabled={!selectedUserId || addMemberMutation.isPending}
              >
                {addMemberMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('common.add')
                )}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => { setIsAddingMember(false); setSelectedUserId(''); }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={() => setIsAddingMember(true)}
            >
              <UserPlus className="w-4 h-4" />
              {t('org.admin.orgs.addMember')}
            </Button>
          )}

          {/* Members list */}
          <ScrollArea className="h-[300px] pr-4">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('org.admin.orgs.noOrgMembers')}</p>
                <p className="text-sm">{t('org.admin.orgs.noOrgMembersHint')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(member.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {member.profile?.full_name || t('org.admin.members.unknownUser')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('org.admin.members.joinedAt')}: {new Date(member.created_at).toLocaleDateString(i18n.language)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(t('org.admin.orgs.removeMemberConfirm', { name: member.profile?.full_name }))) {
                          removeMemberMutation.mutate(member.id);
                        }
                      }}
                      disabled={removeMemberMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
