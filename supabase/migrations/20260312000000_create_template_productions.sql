-- Template Productions: when users "use" a template with their brand
CREATE TABLE IF NOT EXISTS template_productions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  meta_organization_id uuid REFERENCES meta_organizations(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,

  name text NOT NULL DEFAULT 'Untitled Production',
  logo_url text,
  brand_primary text,
  brand_secondary text,
  brand_accent text,

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generating', 'ready', 'exported')),

  order_id uuid REFERENCES template_orders(id) ON DELETE SET NULL,

  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Production Scene Results: per-scene output for a production
CREATE TABLE IF NOT EXISTS production_scene_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES template_productions(id) ON DELETE CASCADE,
  template_scene_id uuid NOT NULL REFERENCES template_scenes(id) ON DELETE CASCADE,

  prompt_override text,
  description_override text,

  generated_images text[] DEFAULT '{}',
  selected_image_url text,

  video_url text,
  video_status text NOT NULL DEFAULT 'pending'
    CHECK (video_status IN ('pending', 'generating', 'done', 'error')),

  custom_reference_url text,
  scene_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_productions_template ON template_productions(template_id);
CREATE INDEX idx_productions_meta_org ON template_productions(meta_organization_id);
CREATE INDEX idx_productions_created_by ON template_productions(created_by);
CREATE INDEX idx_productions_status ON template_productions(status);
CREATE INDEX idx_scene_results_production ON production_scene_results(production_id);
CREATE INDEX idx_scene_results_scene ON production_scene_results(template_scene_id);

-- Updated_at triggers
CREATE TRIGGER update_template_productions_updated_at
  BEFORE UPDATE ON template_productions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_scene_results_updated_at
  BEFORE UPDATE ON production_scene_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE template_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_scene_results ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies for template_productions
-- ============================================================

CREATE POLICY "System admins can manage all productions"
  ON template_productions FOR ALL
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

CREATE POLICY "Meta org admins can manage their productions"
  ON template_productions FOR ALL
  USING (
    meta_organization_id IS NOT NULL
    AND is_meta_org_admin(meta_organization_id)
  )
  WITH CHECK (
    meta_organization_id IS NOT NULL
    AND is_meta_org_admin(meta_organization_id)
  );

CREATE POLICY "Authenticated users can create productions"
  ON template_productions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view own productions"
  ON template_productions FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can update own productions"
  ON template_productions FOR UPDATE
  USING (auth.uid() = created_by);

-- ============================================================
-- RLS Policies for production_scene_results
-- ============================================================

CREATE POLICY "System admins can manage all scene results"
  ON production_scene_results FOR ALL
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

CREATE POLICY "Meta org admins can manage their scene results"
  ON production_scene_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM template_productions p
      WHERE p.id = production_scene_results.production_id
        AND p.meta_organization_id IS NOT NULL
        AND is_meta_org_admin(p.meta_organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM template_productions p
      WHERE p.id = production_scene_results.production_id
        AND p.meta_organization_id IS NOT NULL
        AND is_meta_org_admin(p.meta_organization_id)
    )
  );

CREATE POLICY "Users can manage own production scene results"
  ON production_scene_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM template_productions p
      WHERE p.id = production_scene_results.production_id
        AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM template_productions p
      WHERE p.id = production_scene_results.production_id
        AND p.created_by = auth.uid()
    )
  );
