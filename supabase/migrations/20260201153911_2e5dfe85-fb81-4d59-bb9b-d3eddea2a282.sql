-- Create new org_role enum with meta_org_admin
DROP TYPE IF EXISTS public.org_role CASCADE;
CREATE TYPE public.org_role AS ENUM ('meta_org_admin', 'org_admin', 'user');

-- Create meta_organizations table (white-label parent orgs with branding)
CREATE TABLE public.meta_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#00DBDB',
  secondary_color TEXT DEFAULT '#CEE95C',
  accent_color TEXT DEFAULT '#FF6D66',
  font_family TEXT DEFAULT 'system-ui',
  custom_domain TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add meta_organization_id to organizations table
ALTER TABLE public.organizations 
ADD COLUMN meta_organization_id UUID REFERENCES public.meta_organizations(id) ON DELETE CASCADE;

-- Remove branding fields from organizations (will use own or inherit)
-- Keep them for now as sub-orgs have "fully independent" branding
-- Remove subdomain-related fields since sub-orgs don't have direct access
ALTER TABLE public.organizations DROP COLUMN IF EXISTS custom_domain;

-- Create meta_organization_memberships table
CREATE TABLE public.meta_organization_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_organization_id UUID NOT NULL REFERENCES public.meta_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.org_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meta_organization_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.meta_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_organization_memberships ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is meta org member
CREATE OR REPLACE FUNCTION public.is_member_of_meta_org(_meta_org_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meta_organization_memberships
    WHERE meta_organization_id = _meta_org_id AND user_id = _user_id
  );
$$;

-- Helper function: Check if user is meta org admin
CREATE OR REPLACE FUNCTION public.is_meta_org_admin(_meta_org_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meta_organization_memberships
    WHERE meta_organization_id = _meta_org_id AND user_id = _user_id AND role = 'meta_org_admin'
  );
$$;

-- Helper function: Get user's meta org IDs
CREATE OR REPLACE FUNCTION public.get_user_meta_org_ids(_user_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT meta_organization_id FROM public.meta_organization_memberships
  WHERE user_id = _user_id;
$$;

-- RLS Policies for meta_organizations
CREATE POLICY "System admins can manage all meta orgs"
  ON public.meta_organizations FOR ALL
  USING (is_system_admin());

CREATE POLICY "Meta org members can view their meta org"
  ON public.meta_organizations FOR SELECT
  USING (is_member_of_meta_org(id));

CREATE POLICY "Meta org admins can update their meta org"
  ON public.meta_organizations FOR UPDATE
  USING (is_meta_org_admin(id))
  WITH CHECK (is_meta_org_admin(id));

-- RLS Policies for meta_organization_memberships
CREATE POLICY "System admins can manage all meta org memberships"
  ON public.meta_organization_memberships FOR ALL
  USING (is_system_admin());

CREATE POLICY "Meta org admins can manage memberships in their meta org"
  ON public.meta_organization_memberships FOR ALL
  USING (is_meta_org_admin(meta_organization_id));

CREATE POLICY "Users can view memberships in their meta org"
  ON public.meta_organization_memberships FOR SELECT
  USING (is_member_of_meta_org(meta_organization_id));

-- Update organizations RLS to include meta org admin access
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "System admins can do everything with organizations" ON public.organizations;

CREATE POLICY "System admins can manage all organizations"
  ON public.organizations FOR ALL
  USING (is_system_admin());

CREATE POLICY "Meta org admins can manage orgs in their meta org"
  ON public.organizations FOR ALL
  USING (is_meta_org_admin(meta_organization_id));

CREATE POLICY "Org members can view their organization"
  ON public.organizations FOR SELECT
  USING (is_member_of_org(id));

CREATE POLICY "Org admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (is_org_admin(id))
  WITH CHECK (is_org_admin(id));

-- Update organization_memberships RLS to include meta org admin access
DROP POLICY IF EXISTS "Org admins can view and manage their org memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "System admins can manage all memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can leave organizations" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can view memberships in their org" ON public.organization_memberships;

CREATE POLICY "System admins can manage all org memberships"
  ON public.organization_memberships FOR ALL
  USING (is_system_admin());

CREATE POLICY "Meta org admins can manage memberships in their meta org orgs"
  ON public.organization_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND is_meta_org_admin(o.meta_organization_id)
    )
  );

CREATE POLICY "Org admins can manage memberships in their org"
  ON public.organization_memberships FOR ALL
  USING (is_org_admin(organization_id));

CREATE POLICY "Users can view memberships in their org"
  ON public.organization_memberships FOR SELECT
  USING (is_member_of_org(organization_id));

CREATE POLICY "Users can leave organizations"
  ON public.organization_memberships FOR DELETE
  USING (user_id = auth.uid());

-- Add triggers for updated_at
CREATE TRIGGER update_meta_organizations_updated_at
  BEFORE UPDATE ON public.meta_organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_organization_memberships_updated_at
  BEFORE UPDATE ON public.meta_organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();