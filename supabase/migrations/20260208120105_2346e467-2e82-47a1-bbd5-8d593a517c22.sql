CREATE POLICY "System admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_system_admin())
WITH CHECK (is_system_admin());