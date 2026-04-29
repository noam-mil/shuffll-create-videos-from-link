-- =============================================================
-- Seed data exported from old Supabase instance
-- Run this AFTER combined-migrations.sql in the SQL Editor
-- =============================================================
-- IMPORTANT: auth.users must be recreated first (via invite or
-- Supabase Auth dashboard) before running this. The user_id
-- references below must match existing auth.users entries.
-- =============================================================

-- =====================
-- 1. system_settings (no FK dependencies)
-- =====================
INSERT INTO public.system_settings (id, key, value, description, created_at, updated_at) VALUES
  ('ca302a1a-8163-4be9-9d96-ec0cd8e55040', 'general', '{"maintenanceMode":false,"platformName":"AI Video Creator","selfRegistration":false,"supportEmail":""}', 'General platform settings', '2026-02-01 18:29:37.510899+00', '2026-02-01 18:29:37.510899+00'),
  ('78f8fbb0-f293-4b3e-859b-404b70a46ad0', 'security', '{"autoLockout":true,"maxLoginAttempts":5,"requireMfa":false,"sessionTimeout":60}', 'Security settings', '2026-02-01 18:29:37.510899+00', '2026-02-01 18:29:37.510899+00'),
  ('91874636-dae1-451c-a6aa-27093ef71041', 'notifications', '{"adminAlerts":true,"dailyReport":false,"emailNotifications":true}', 'Notification settings', '2026-02-01 18:29:37.510899+00', '2026-02-01 18:29:37.510899+00'),
  ('c6634520-fb47-4965-8e31-df989e441a61', 'email', '{"configured":false,"fromEmail":"","smtpHost":"","smtpPort":587,"smtpUser":""}', 'Email/SMTP settings', '2026-02-01 18:29:37.510899+00', '2026-02-01 18:29:37.510899+00')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 2. meta_organizations
-- =====================
INSERT INTO public.meta_organizations (id, name, slug, custom_domain, is_active, created_at, updated_at, logo_url, show_dummy_templates) VALUES
  ('7da27535-531f-4398-8c5f-b595e7290651', 'Correct Gifts', 'correct', NULL, true, '2026-02-01 15:58:22.668509+00', '2026-02-01 15:58:22.668509+00', NULL, false)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 3. organizations (depends on meta_organizations)
-- =====================
INSERT INTO public.organizations (id, name, slug, logo_url, primary_color, secondary_color, accent_color, font_family, favicon_url, is_active, created_at, updated_at, meta_organization_id) VALUES
  ('fdb77e89-9b93-4b27-90b3-c48eac0bc179', 'Correct Gifts', 'correct', NULL, '#00DBDB', '#CEE95C', '#FF6D66', 'system-ui', NULL, true, '2026-02-01 15:25:47.948021+00', '2026-02-01 15:25:47.948021+00', NULL),
  ('86b6422c-eab2-40d4-9fd6-3d46a70c334b', 'Clalit', 'clalit-1769980835068', NULL, '#00DBDB', '#CEE95C', '#FF6D66', 'system-ui', NULL, true, '2026-02-01 21:20:35.263073+00', '2026-02-01 21:20:35.263073+00', '7da27535-531f-4398-8c5f-b595e7290651')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 4. profiles (depends on auth.users)
-- =====================
INSERT INTO public.profiles (id, user_id, full_name, avatar_url, created_at, updated_at) VALUES
  ('44d65d71-40fa-456b-9bad-447bf6a332de', '9f1987ec-cc05-48b2-a51a-946cca512008', 'Isaac', NULL, '2026-02-01 16:06:10.695419+00', '2026-02-01 16:06:10.695419+00'),
  ('5f7ec8bc-bf9c-46db-9ab9-aa63c04513e9', 'e21359fd-a343-4d47-800e-730461bdfa50', 'Ike', NULL, '2026-02-01 16:57:33.507327+00', '2026-02-01 16:57:33.507327+00'),
  ('9b100778-312b-4c43-863b-0027bc08eec4', 'fe0730dd-9f9b-4d91-bd7c-0747e68b4c66', 'noam', NULL, '2026-02-08 11:39:28.713847+00', '2026-02-08 11:39:28.713847+00'),
  ('4749ada8-2118-4276-a066-72168ba176c8', '83423521-abaa-4625-8d3c-e5ef6224c4d6', 'Chen Samet', NULL, '2026-02-08 11:38:33.619388+00', '2026-02-08 12:02:00.095183+00'),
  ('185d486a-95e3-477a-88bb-19eede3d6321', '7b920f58-01e8-471f-bebd-17c272821913', 'Aviv Kazoomski', NULL, '2026-02-18 14:43:15.447236+00', '2026-02-18 14:43:15.447236+00')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 5. user_roles (depends on auth.users)
-- =====================
INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
  ('dc151660-66ba-47f7-a502-9aa496b7cbc3', '9f1987ec-cc05-48b2-a51a-946cca512008', 'system_admin', '2026-02-01 16:06:53.191682+00')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 6. meta_organization_memberships (depends on meta_organizations + auth.users)
-- =====================
INSERT INTO public.meta_organization_memberships (id, meta_organization_id, user_id, role, created_at, updated_at) VALUES
  ('437854b7-23b8-4cbd-af5a-a6bc351b46b6', '7da27535-531f-4398-8c5f-b595e7290651', 'e21359fd-a343-4d47-800e-730461bdfa50', 'meta_org_admin', '2026-02-01 16:57:33.595358+00', '2026-02-01 16:57:33.595358+00'),
  ('98bf4a67-f28e-4f66-8952-afe49348ec39', '7da27535-531f-4398-8c5f-b595e7290651', '83423521-abaa-4625-8d3c-e5ef6224c4d6', 'org_admin', '2026-02-08 11:38:33.758289+00', '2026-02-08 11:38:33.758289+00'),
  ('1c11d277-84a9-4651-aaa4-e61ecd815a5b', '7da27535-531f-4398-8c5f-b595e7290651', 'fe0730dd-9f9b-4d91-bd7c-0747e68b4c66', 'meta_org_admin', '2026-02-08 11:39:28.813984+00', '2026-02-08 11:39:28.813984+00'),
  ('bda49240-3e62-417a-a5e0-c6051358685b', '7da27535-531f-4398-8c5f-b595e7290651', '7b920f58-01e8-471f-bebd-17c272821913', 'meta_org_admin', '2026-02-18 14:43:15.58071+00', '2026-02-18 14:43:15.58071+00')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 7. organization_excel_settings (depends on meta_organizations)
-- =====================
INSERT INTO public.organization_excel_settings (id, organization_id, meta_organization_id, field_type, is_mandatory, correct_year, created_at, updated_at, field_name, allow_empty, regex_pattern) VALUES
  ('556b5414-3012-46fd-84c1-11ee1aa00eb9', NULL, '7da27535-531f-4398-8c5f-b595e7290651', 'celebration_date', true, true, '2026-02-02 19:52:47.827244+00', '2026-02-02 19:52:47.827244+00', 'Celebration', true, NULL),
  ('7223da5d-eccb-4f7e-a4de-bd57d5428295', NULL, '7da27535-531f-4398-8c5f-b595e7290651', 'first_name', true, false, '2026-02-02 19:52:47.827244+00', '2026-02-02 19:52:47.827244+00', 'Name', true, NULL)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 8. campaigns (depends on organizations)
-- =====================
INSERT INTO public.campaigns (id, organization_id, name, client_status, system_status, template_id, created_at, updated_at) VALUES
  ('7577744c-b8cc-417a-a6c4-7d502df31a6f', '86b6422c-eab2-40d4-9fd6-3d46a70c334b', 'campaignush', 'none', NULL, NULL, '2026-02-05 07:05:51.422634+00', '2026-02-05 07:05:51.422634+00')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- Empty tables (no data to seed):
--   - campaign_entries
--   - organization_memberships
-- =====================
