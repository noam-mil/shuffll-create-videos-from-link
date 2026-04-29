-- Templates table: stores video template metadata
-- meta_organization_id = NULL means system-wide template
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'birthday',
  event_type text,
  realism text,
  lang text NOT NULL DEFAULT 'en',
  poster_url text,
  video_id text,
  meta_organization_id uuid REFERENCES meta_organizations(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Template scenes: individual scenes within a template
CREATE TABLE IF NOT EXISTS template_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  scene_order integer NOT NULL DEFAULT 0,
  reference_url text,
  prompt text DEFAULT '',
  description text,
  video_prompt text,
  scene_type text NOT NULL DEFAULT 'single' CHECK (scene_type IN ('single', 'first_frame', 'last_frame')),
  auto_select boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Template orders: when users order a template
CREATE TABLE IF NOT EXISTS template_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  meta_organization_id uuid REFERENCES meta_organizations(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  event_type text,
  logo_url text,
  message_text text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_templates_meta_org ON templates(meta_organization_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_template_scenes_template ON template_scenes(template_id);
CREATE INDEX idx_template_scenes_order ON template_scenes(template_id, scene_order);
CREATE INDEX idx_template_orders_template ON template_orders(template_id);
CREATE INDEX idx_template_orders_meta_org ON template_orders(meta_organization_id);

-- Updated_at triggers
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_scenes_updated_at
  BEFORE UPDATE ON template_scenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_orders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies for templates
-- ============================================================

-- System admins: full access to all templates
CREATE POLICY "System admins can manage all templates"
  ON templates FOR ALL
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- Meta org admins: full access to their org's templates
CREATE POLICY "Meta org admins can manage their templates"
  ON templates FOR ALL
  USING (
    meta_organization_id IS NOT NULL
    AND is_meta_org_admin(meta_organization_id)
  )
  WITH CHECK (
    meta_organization_id IS NOT NULL
    AND is_meta_org_admin(meta_organization_id)
  );

-- All authenticated users: read active system-wide templates
CREATE POLICY "Authenticated users can view active system templates"
  ON templates FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_active = true
    AND meta_organization_id IS NULL
  );

-- Meta org members: read active templates for their org
CREATE POLICY "Meta org members can view active org templates"
  ON templates FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_active = true
    AND meta_organization_id IS NOT NULL
    AND is_member_of_meta_org(meta_organization_id)
  );

-- ============================================================
-- RLS Policies for template_scenes
-- ============================================================

-- System admins: full access
CREATE POLICY "System admins can manage all scenes"
  ON template_scenes FOR ALL
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- Meta org admins: access scenes of their templates
CREATE POLICY "Meta org admins can manage their template scenes"
  ON template_scenes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM templates t
      WHERE t.id = template_scenes.template_id
        AND t.meta_organization_id IS NOT NULL
        AND is_meta_org_admin(t.meta_organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM templates t
      WHERE t.id = template_scenes.template_id
        AND t.meta_organization_id IS NOT NULL
        AND is_meta_org_admin(t.meta_organization_id)
    )
  );

-- Authenticated users: read scenes of visible templates
CREATE POLICY "Authenticated users can view scenes of visible templates"
  ON template_scenes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM templates t
      WHERE t.id = template_scenes.template_id
        AND t.is_active = true
        AND (
          t.meta_organization_id IS NULL
          OR is_member_of_meta_org(t.meta_organization_id)
        )
    )
  );

-- ============================================================
-- RLS Policies for template_orders
-- ============================================================

-- System admins: full access
CREATE POLICY "System admins can manage all orders"
  ON template_orders FOR ALL
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- Meta org admins: view/manage orders for their org
CREATE POLICY "Meta org admins can manage their org orders"
  ON template_orders FOR ALL
  USING (
    meta_organization_id IS NOT NULL
    AND is_meta_org_admin(meta_organization_id)
  )
  WITH CHECK (
    meta_organization_id IS NOT NULL
    AND is_meta_org_admin(meta_organization_id)
  );

-- Authenticated users: create orders
CREATE POLICY "Authenticated users can create orders"
  ON template_orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can view their own orders
CREATE POLICY "Users can view their own orders"
  ON template_orders FOR SELECT
  USING (auth.uid() = created_by);

-- ============================================================
-- Storage bucket for template assets
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('template-assets', 'template-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view template assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-assets');

CREATE POLICY "System admins can upload template assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'template-assets'
    AND is_system_admin()
  );

CREATE POLICY "Meta org admins can upload template assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'template-assets'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "System admins can update template assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'template-assets' AND is_system_admin());

CREATE POLICY "System admins can delete template assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'template-assets' AND is_system_admin());
