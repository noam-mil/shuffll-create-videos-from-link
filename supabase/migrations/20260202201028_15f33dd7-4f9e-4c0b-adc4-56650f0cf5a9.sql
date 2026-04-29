-- Add new columns to organization_excel_settings for row-level validation
ALTER TABLE public.organization_excel_settings
ADD COLUMN allow_empty boolean NOT NULL DEFAULT true,
ADD COLUMN regex_pattern text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.organization_excel_settings.allow_empty IS 'If false, all rows must have a non-empty value for this field';
COMMENT ON COLUMN public.organization_excel_settings.regex_pattern IS 'Optional regex pattern to validate field values against';