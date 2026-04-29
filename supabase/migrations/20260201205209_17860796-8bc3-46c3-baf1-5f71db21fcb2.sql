-- Create table for organization excel field mappings
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
EXECUTE FUNCTION public.update_updated_at_column();