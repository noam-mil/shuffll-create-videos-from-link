-- Create enum for organization member roles
CREATE TYPE public.org_role AS ENUM ('org_admin', 'user');

-- Create enum for system-level roles
CREATE TYPE public.app_role AS ENUM ('system_admin');

-- Organizations table with full branding
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00DBDB',
  secondary_color TEXT DEFAULT '#CEE95C',
  accent_color TEXT DEFAULT '#FF6D66',
  font_family TEXT DEFAULT 'system-ui',
  favicon_url TEXT,
  custom_domain TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System admins table (separate from org roles to avoid privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Organization memberships (links users to organizations with roles)
CREATE TABLE public.organization_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- Profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is a system admin
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'system_admin'
  );
$$;

-- Helper function: Check if user is a member of an organization
CREATE OR REPLACE FUNCTION public.is_member_of_org(_org_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE organization_id = _org_id AND user_id = _user_id
  );
$$;

-- Helper function: Check if user is an org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE organization_id = _org_id AND user_id = _user_id AND role = 'org_admin'
  );
$$;

-- Helper function: Get user's organization memberships
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_memberships
  WHERE user_id = _user_id;
$$;

-- RLS Policies for organizations
CREATE POLICY "System admins can do everything with organizations"
  ON public.organizations FOR ALL
  USING (public.is_system_admin());

CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (public.is_member_of_org(id));

CREATE POLICY "Org admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (public.is_org_admin(id))
  WITH CHECK (public.is_org_admin(id));

-- RLS Policies for user_roles
CREATE POLICY "System admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.is_system_admin());

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for organization_memberships
CREATE POLICY "System admins can manage all memberships"
  ON public.organization_memberships FOR ALL
  USING (public.is_system_admin());

CREATE POLICY "Org admins can view and manage their org memberships"
  ON public.organization_memberships FOR ALL
  USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can view memberships in their org"
  ON public.organization_memberships FOR SELECT
  USING (public.is_member_of_org(organization_id));

CREATE POLICY "Users can leave organizations"
  ON public.organization_memberships FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_memberships_updated_at
  BEFORE UPDATE ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create index for faster lookups
CREATE INDEX idx_org_memberships_org_id ON public.organization_memberships(organization_id);
CREATE INDEX idx_org_memberships_user_id ON public.organization_memberships(user_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);-- Create new org_role enum with meta_org_admin
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
  EXECUTE FUNCTION public.update_updated_at_column();-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

-- System admins can view all profiles
CREATE POLICY "System admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_system_admin());

-- Users in the same meta organization can view each other's profiles
CREATE POLICY "Meta org members can view profiles in their meta org"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meta_organization_memberships m1
    JOIN public.meta_organization_memberships m2 ON m1.meta_organization_id = m2.meta_organization_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.user_id
  )
);

-- Users in the same organization can view each other's profiles
CREATE POLICY "Org members can view profiles in their org"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_memberships o1
    JOIN public.organization_memberships o2 ON o1.organization_id = o2.organization_id
    WHERE o1.user_id = auth.uid() AND o2.user_id = profiles.user_id
  )
);-- Create system_settings table for global platform settings
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only system admins can read and manage settings
CREATE POLICY "System admins can view all settings"
ON public.system_settings FOR SELECT
USING (is_system_admin());

CREATE POLICY "System admins can manage settings"
ON public.system_settings FOR ALL
USING (is_system_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
('general', '{"platformName": "AI Video Creator", "supportEmail": "", "maintenanceMode": false, "selfRegistration": false}', 'General platform settings'),
('security', '{"requireMfa": false, "autoLockout": true, "sessionTimeout": 60, "maxLoginAttempts": 5}', 'Security settings'),
('notifications', '{"emailNotifications": true, "dailyReport": false, "adminAlerts": true}', 'Notification settings'),
('email', '{"smtpHost": "", "smtpPort": 587, "smtpUser": "", "fromEmail": "", "configured": false}', 'Email/SMTP settings');

-- Remove branding columns from meta_organizations (branding is only per sub-org)
ALTER TABLE public.meta_organizations 
DROP COLUMN IF EXISTS primary_color,
DROP COLUMN IF EXISTS secondary_color,
DROP COLUMN IF EXISTS accent_color,
DROP COLUMN IF EXISTS font_family,
DROP COLUMN IF EXISTS logo_url,
DROP COLUMN IF EXISTS favicon_url;-- Create table for organization excel field mappings
CREATE TABLE public.organization_excel_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  meta_organization_id UUID REFERENCES public.meta_organizations(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL, -- 'first_name', 'full_name', 'phone_number', 'email', 'celebration_date'
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  correct_year BOOLEAN NOT NULL DEFAULT false, -- Only applicable for celebration_date
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_field_type CHECK (field_type IN ('first_name', 'full_name', 'phone_number', 'email', 'celebration_date')),
  CONSTRAINT org_or_meta_org CHECK (
    (organization_id IS NOT NULL AND meta_organization_id IS NULL) OR
    (organization_id IS NULL AND meta_organization_id IS NOT NULL)
  ),
  CONSTRAINT unique_field_per_org UNIQUE (organization_id, field_type),
  CONSTRAINT unique_field_per_meta_org UNIQUE (meta_organization_id, field_type)
);

-- Enable RLS
ALTER TABLE public.organization_excel_settings ENABLE ROW LEVEL SECURITY;

-- System admins can manage all settings
CREATE POLICY "System admins can manage all excel settings"
ON public.organization_excel_settings
FOR ALL
USING (is_system_admin());

-- Meta org admins can manage settings for their meta org
CREATE POLICY "Meta org admins can manage excel settings for their meta org"
ON public.organization_excel_settings
FOR ALL
USING (
  (meta_organization_id IS NOT NULL AND is_meta_org_admin(meta_organization_id)) OR
  (organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM organizations o 
    WHERE o.id = organization_excel_settings.organization_id 
    AND is_meta_org_admin(o.meta_organization_id)
  ))
);

-- Org admins can manage settings for their org
CREATE POLICY "Org admins can manage excel settings for their org"
ON public.organization_excel_settings
FOR ALL
USING (organization_id IS NOT NULL AND is_org_admin(organization_id));

-- Members can view settings
CREATE POLICY "Members can view excel settings for their org"
ON public.organization_excel_settings
FOR SELECT
USING (
  (organization_id IS NOT NULL AND is_member_of_org(organization_id)) OR
  (meta_organization_id IS NOT NULL AND is_member_of_meta_org(meta_organization_id))
);

-- Trigger for updated_at
CREATE TRIGGER update_organization_excel_settings_updated_at
BEFORE UPDATE ON public.organization_excel_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();-- Add field_name column to organization_excel_settings
ALTER TABLE public.organization_excel_settings 
ADD COLUMN field_name TEXT NOT NULL DEFAULT '';

-- Remove the unique constraints based on field_type since we now have custom field names
ALTER TABLE public.organization_excel_settings 
DROP CONSTRAINT IF EXISTS unique_field_per_org;

ALTER TABLE public.organization_excel_settings 
DROP CONSTRAINT IF EXISTS unique_field_per_meta_org;

-- Add new unique constraints based on field_name
ALTER TABLE public.organization_excel_settings 
ADD CONSTRAINT unique_field_name_per_org UNIQUE (organization_id, field_name);

ALTER TABLE public.organization_excel_settings 
ADD CONSTRAINT unique_field_name_per_meta_org UNIQUE (meta_organization_id, field_name);-- Add logo_url column to meta_organizations table
ALTER TABLE public.meta_organizations
ADD COLUMN logo_url text;

-- Create storage bucket for meta organization logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('meta-org-logos', 'meta-org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view meta org logos (public bucket)
CREATE POLICY "Anyone can view meta org logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'meta-org-logos');

-- Allow meta org admins to upload logos for their meta org
CREATE POLICY "Meta org admins can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'meta-org-logos' 
  AND (
    is_system_admin()
    OR is_meta_org_admin((storage.foldername(name))[1]::uuid)
  )
);

-- Allow meta org admins to update logos for their meta org
CREATE POLICY "Meta org admins can update logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'meta-org-logos' 
  AND (
    is_system_admin()
    OR is_meta_org_admin((storage.foldername(name))[1]::uuid)
  )
);

-- Allow meta org admins to delete logos for their meta org
CREATE POLICY "Meta org admins can delete logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'meta-org-logos' 
  AND (
    is_system_admin()
    OR is_meta_org_admin((storage.foldername(name))[1]::uuid)
  )
);-- Add new columns to organization_excel_settings for row-level validation
ALTER TABLE public.organization_excel_settings
ADD COLUMN allow_empty boolean NOT NULL DEFAULT true,
ADD COLUMN regex_pattern text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.organization_excel_settings.allow_empty IS 'If false, all rows must have a non-empty value for this field';
COMMENT ON COLUMN public.organization_excel_settings.regex_pattern IS 'Optional regex pattern to validate field values against';-- Create enum for client status
CREATE TYPE public.campaign_client_status AS ENUM (
  'none',
  'concept_sent',
  'concept_approved',
  'working_on_creative',
  'list_uploaded_for_renders',
  'ready_for_internal_tests',
  'ready_for_tests_with_client',
  'list_uploaded_for_send',
  'client_rejects',
  'client_approved_send'
);

-- Create enum for system status
CREATE TYPE public.campaign_system_status AS ENUM (
  'list_successfully_loaded',
  'rendering',
  'ready_to_send',
  'tests_done'
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_status public.campaign_client_status NOT NULL DEFAULT 'none',
  system_status public.campaign_system_status NULL,
  template_id TEXT NULL, -- references the template key/id used in the app
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_entries table (the uploaded names/people)
CREATE TABLE public.campaign_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}', -- flexible JSON matching excel settings
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_entries ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at on campaigns
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for campaigns

-- System admins can manage all campaigns
CREATE POLICY "System admins can manage all campaigns"
ON public.campaigns
FOR ALL
USING (is_system_admin());

-- Meta org admins can manage campaigns in their meta org's sub-orgs
CREATE POLICY "Meta org admins can manage campaigns in their meta org"
ON public.campaigns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = campaigns.organization_id
    AND is_meta_org_admin(o.meta_organization_id)
  )
);

-- Org admins can manage campaigns in their org
CREATE POLICY "Org admins can manage campaigns in their org"
ON public.campaigns
FOR ALL
USING (is_org_admin(organization_id));

-- Org members can view campaigns in their org
CREATE POLICY "Org members can view campaigns"
ON public.campaigns
FOR SELECT
USING (is_member_of_org(organization_id));

-- RLS Policies for campaign_entries

-- System admins can manage all entries
CREATE POLICY "System admins can manage all campaign entries"
ON public.campaign_entries
FOR ALL
USING (is_system_admin());

-- Meta org admins can manage entries via campaign's org
CREATE POLICY "Meta org admins can manage campaign entries"
ON public.campaign_entries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.organizations o ON o.id = c.organization_id
    WHERE c.id = campaign_entries.campaign_id
    AND is_meta_org_admin(o.meta_organization_id)
  )
);

-- Org admins can manage entries in their org's campaigns
CREATE POLICY "Org admins can manage campaign entries"
ON public.campaign_entries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_entries.campaign_id
    AND is_org_admin(c.organization_id)
  )
);

-- Org members can view entries in their org's campaigns
CREATE POLICY "Org members can view campaign entries"
ON public.campaign_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_entries.campaign_id
    AND is_member_of_org(c.organization_id)
  )
);
-- Deny anonymous access to profiles
CREATE POLICY "deny_anon_access" ON public.profiles FOR SELECT TO anon USING (false);

-- Deny anonymous access to campaign_entries
CREATE POLICY "deny_anon_access" ON public.campaign_entries FOR SELECT TO anon USING (false);
CREATE POLICY "System admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_system_admin())
WITH CHECK (is_system_admin());ALTER TABLE public.meta_organizations ADD COLUMN show_dummy_templates boolean NOT NULL DEFAULT false;-- Allow anyone (including anonymous) to view active meta organizations by slug
CREATE POLICY "Anyone can view active meta orgs"
ON public.meta_organizations
FOR SELECT
TO anon, authenticated
USING (is_active = true);
DROP POLICY "Anyone can view active meta orgs" ON public.meta_organizations;