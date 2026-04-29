import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, OrganizationMembership, MetaOrganizationMembership, AppRole } from '@/types/organization';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  orgMemberships: OrganizationMembership[];
  metaOrgMemberships: MetaOrganizationMembership[];
  isSystemAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  getUserRole: (orgId: string) => AppRole | null;
  getMetaOrgRole: (metaOrgId: string) => AppRole | null;
  isMetaOrgAdmin: (metaOrgId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orgMemberships, setOrgMemberships] = useState<OrganizationMembership[]>([]);
  const [metaOrgMemberships, setMetaOrgMemberships] = useState<MetaOrganizationMembership[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch organization memberships
      const { data: orgMembershipData } = await supabase
        .from('organization_memberships')
        .select('*, organization:organizations(*)')
        .eq('user_id', userId);

      if (orgMembershipData) {
        setOrgMemberships(orgMembershipData as unknown as OrganizationMembership[]);
      }

      // Fetch meta organization memberships
      const { data: metaOrgMembershipData } = await supabase
        .from('meta_organization_memberships')
        .select('*, meta_organization:meta_organizations(*)')
        .eq('user_id', userId);

      if (metaOrgMembershipData) {
        setMetaOrgMemberships(metaOrgMembershipData as unknown as MetaOrganizationMembership[]);
      }

      // Check if system admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'system_admin')
        .maybeSingle();

      setIsSystemAdmin(!!roleData);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Reset loading so ProtectedRoute waits for role data before rendering
          setIsLoading(true);
          // Use setTimeout to avoid Supabase auth deadlock, but still await inside
          setTimeout(async () => {
            await fetchUserData(newSession.user.id);
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setOrgMemberships([]);
          setMetaOrgMemberships([]);
          setIsSystemAdmin(false);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const getUserRole = (orgId: string): AppRole | null => {
    if (isSystemAdmin) return 'system_admin';
    const membership = orgMemberships.find(m => m.organization_id === orgId);
    return membership?.role ?? null;
  };

  const getMetaOrgRole = (metaOrgId: string): AppRole | null => {
    if (isSystemAdmin) return 'system_admin';
    const membership = metaOrgMemberships.find(m => m.meta_organization_id === metaOrgId);
    return membership?.role ?? null;
  };

  const isMetaOrgAdmin = (metaOrgId: string): boolean => {
    if (isSystemAdmin) return true;
    const membership = metaOrgMemberships.find(m => m.meta_organization_id === metaOrgId);
    return membership?.role === 'meta_org_admin';
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      orgMemberships,
      metaOrgMemberships,
      isSystemAdmin,
      isLoading,
      signIn,
      signUp,
      signOut,
      getUserRole,
      getMetaOrgRole,
      isMetaOrgAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
