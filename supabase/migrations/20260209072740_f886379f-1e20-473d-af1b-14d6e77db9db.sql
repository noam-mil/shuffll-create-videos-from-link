-- Allow anyone (including anonymous) to view active meta organizations by slug
CREATE POLICY "Anyone can view active meta orgs"
ON public.meta_organizations
FOR SELECT
TO anon, authenticated
USING (is_active = true);
