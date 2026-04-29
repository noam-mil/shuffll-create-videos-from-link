-- Add noam@shuffll.com as system admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'system_admin'
FROM auth.users
WHERE email = 'noam@shuffll.com'
ON CONFLICT (user_id, role) DO NOTHING;
