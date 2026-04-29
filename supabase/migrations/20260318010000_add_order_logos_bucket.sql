-- Create storage bucket for order logos (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-logos', 'order-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload a logo (public order page, no auth)
CREATE POLICY "Anyone can upload order logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'order-logos');

-- Anyone can view logos (needed to display them)
CREATE POLICY "Anyone can view order logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-logos');

-- System admins can delete logos
CREATE POLICY "Admins can delete order logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'order-logos' AND is_system_admin());

-- Add logo_url column to orders (stores Supabase Storage public URL)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS logo_url TEXT;
