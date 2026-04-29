-- Add logo_url column to meta_organizations table
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
);