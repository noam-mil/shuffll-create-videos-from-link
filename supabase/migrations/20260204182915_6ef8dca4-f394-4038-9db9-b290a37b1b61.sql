-- Create enum for client status
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