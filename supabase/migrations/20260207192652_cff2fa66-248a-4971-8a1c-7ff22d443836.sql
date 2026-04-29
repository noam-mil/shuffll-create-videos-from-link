
-- Deny anonymous access to profiles
CREATE POLICY "deny_anon_access" ON public.profiles FOR SELECT TO anon USING (false);

-- Deny anonymous access to campaign_entries
CREATE POLICY "deny_anon_access" ON public.campaign_entries FOR SELECT TO anon USING (false);
