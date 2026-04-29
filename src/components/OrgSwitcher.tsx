import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Check, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const OrgSwitcher = () => {
  const { t } = useTranslation();
  const { metaOrganization, organizations, currentOrg, setCurrentOrg } = useOrganization();
  const { getMetaOrgRole, isSystemAdmin } = useAuth();
  
  // Check if user is meta org admin (can switch orgs)
  const userRole = metaOrganization ? getMetaOrgRole(metaOrganization.id) : null;
  const canSwitchOrgs = isSystemAdmin || userRole === 'meta_org_admin';
  
  // Don't show if user can't switch or no sub-orgs exist
  if (!canSwitchOrgs || organizations.length === 0) {
    return null;
  }

  const currentOrgName = currentOrg?.name || t('admin.allOrganizations', 'All Organizations');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 min-w-[140px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="max-w-[120px] truncate">{currentOrgName}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          {t('admin.switchOrganization', 'Switch Organization')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* "All Organizations" option for meta org admins */}
        <DropdownMenuItem
          onClick={() => setCurrentOrg(null)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span>{t('admin.allOrganizations', 'All Organizations')}</span>
          </div>
          {!currentOrg && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* List of sub-organizations */}
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => setCurrentOrg(org)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {org.logo_url ? (
                <img src={org.logo_url} alt={org.name} className="w-4 h-4 rounded object-cover" />
              ) : (
                <Building2 className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="max-w-[140px] truncate">{org.name}</span>
            </div>
            {currentOrg?.id === org.id && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
