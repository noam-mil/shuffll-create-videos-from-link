import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MetaOrganization, Organization } from '@/types/organization';

interface MetaOrganizationContextType {
  metaOrganization: MetaOrganization | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setCurrentOrg: (org: Organization | null) => void;
}

const MetaOrganizationContext = createContext<MetaOrganizationContextType | undefined>(undefined);

export const MetaOrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { metaOrgSlug } = useParams<{ metaOrgSlug: string }>();
  const [metaOrganization, setMetaOrganization] = useState<MetaOrganization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetaOrganization = async () => {
    if (!metaOrgSlug) {
      setMetaOrganization(null);
      setOrganizations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch meta organization
      const { data: metaOrgData, error: metaOrgError } = await supabase
        .from('meta_organizations')
        .select('*')
        .eq('slug', metaOrgSlug)
        .eq('is_active', true)
        .maybeSingle();

      if (metaOrgError) {
        setError('Error loading organization');
        console.error('Error fetching meta organization:', metaOrgError);
        return;
      }
      
      if (!metaOrgData) {
        setError('Organization not found');
        return;
      }

      setMetaOrganization(metaOrgData as MetaOrganization);

      // Fetch sub-organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .eq('meta_organization_id', metaOrgData.id)
        .eq('is_active', true)
        .order('name');

      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
      } else {
        setOrganizations((orgsData || []) as Organization[]);
      }
    } catch (err) {
      setError('Error loading organization');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetaOrganization();
  }, [metaOrgSlug]);

  // Apply current sub-organization branding as CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    if (currentOrg) {
      // Apply sub-org branding
      if (currentOrg.primary_color) root.style.setProperty('--org-primary', currentOrg.primary_color);
      if (currentOrg.secondary_color) root.style.setProperty('--org-secondary', currentOrg.secondary_color);
      if (currentOrg.accent_color) root.style.setProperty('--org-accent', currentOrg.accent_color);
      if (currentOrg.font_family) root.style.setProperty('--org-font', currentOrg.font_family);

      // Update favicon if set
      if (currentOrg.favicon_url) {
        const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (favicon) {
          favicon.href = currentOrg.favicon_url;
        }
      }

      // Update document title
      document.title = `${currentOrg.name} | Video Creator`;
    } else if (metaOrganization) {
      // Use defaults with meta org name
      root.style.setProperty('--org-primary', '#00DBDB');
      root.style.setProperty('--org-secondary', '#CEE95C');
      root.style.setProperty('--org-accent', '#FF6D66');
      root.style.setProperty('--org-font', 'system-ui');
      document.title = `${metaOrganization.name} | Video Creator`;
    }

    return () => {
      // Reset to defaults on unmount
      root.style.removeProperty('--org-primary');
      root.style.removeProperty('--org-secondary');
      root.style.removeProperty('--org-accent');
      root.style.removeProperty('--org-font');
    };
  }, [currentOrg, metaOrganization]);

  return (
    <MetaOrganizationContext.Provider value={{ 
      metaOrganization, 
      organizations, 
      currentOrg, 
      isLoading, 
      error, 
      refetch: fetchMetaOrganization,
      setCurrentOrg 
    }}>
      {children}
    </MetaOrganizationContext.Provider>
  );
};

export const useMetaOrganization = () => {
  const context = useContext(MetaOrganizationContext);
  if (context === undefined) {
    throw new Error('useMetaOrganization must be used within a MetaOrganizationProvider');
  }
  return context;
};

// Optional version that returns null values when outside provider
export const useOptionalMetaOrganization = () => {
  const context = useContext(MetaOrganizationContext);
  if (context === undefined) {
    return {
      metaOrganization: null,
      organizations: [],
      currentOrg: null,
      isLoading: false,
      error: null,
      refetch: async () => {},
      setCurrentOrg: () => {},
    };
  }
  return context;
};

// Keep the old OrganizationProvider for backwards compatibility but rename context
export const OrganizationProvider = MetaOrganizationProvider;
export const useOrganization = useMetaOrganization;
export const useOptionalOrganization = useOptionalMetaOrganization;
