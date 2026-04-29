-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

-- System admins can view all profiles
CREATE POLICY "System admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_system_admin());

-- Users in the same meta organization can view each other's profiles
CREATE POLICY "Meta org members can view profiles in their meta org"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meta_organization_memberships m1
    JOIN public.meta_organization_memberships m2 ON m1.meta_organization_id = m2.meta_organization_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.user_id
  )
);

-- Users in the same organization can view each other's profiles
CREATE POLICY "Org members can view profiles in their org"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_memberships o1
    JOIN public.organization_memberships o2 ON o1.organization_id = o2.organization_id
    WHERE o1.user_id = auth.uid() AND o2.user_id = profiles.user_id
  )
);