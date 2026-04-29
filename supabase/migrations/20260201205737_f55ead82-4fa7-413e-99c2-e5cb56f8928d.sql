-- Add field_name column to organization_excel_settings
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
ADD CONSTRAINT unique_field_name_per_meta_org UNIQUE (meta_organization_id, field_name);