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
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);