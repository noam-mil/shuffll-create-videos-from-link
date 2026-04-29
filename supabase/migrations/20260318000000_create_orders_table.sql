-- Create orders table for the public /new-order page
CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_name    TEXT        NOT NULL,
  full_name       TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  logo_filename   TEXT,
  event_type      TEXT,
  msg_company     TEXT,
  greeting        TEXT,
  template_name   TEXT,
  full_message    TEXT,
  meta_org_slug   TEXT
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- System admins can read all orders
CREATE POLICY "System admins can read orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (is_system_admin());

-- Anyone can submit an order (public page, no auth required)
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- System admins can delete orders
CREATE POLICY "System admins can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (is_system_admin());
