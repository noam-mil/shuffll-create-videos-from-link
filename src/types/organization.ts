// Meta Organization (white-label parent)
export interface MetaOrganization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  custom_domain: string | null;
  is_active: boolean;
  show_dummy_templates: boolean;
  created_at: string;
  updated_at: string;
}

// Sub-Organization (under a meta org)
export interface Organization {
  id: string;
  meta_organization_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Meta Organization Membership
export interface MetaOrganizationMembership {
  id: string;
  meta_organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  updated_at: string;
  meta_organization?: MetaOrganization;
}

// Organization Membership
export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

// User Profile
export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'system_admin';
  created_at: string;
}

export type OrgRole = 'meta_org_admin' | 'org_admin' | 'user';
export type AppRole = 'system_admin' | 'meta_org_admin' | 'org_admin' | 'user';
