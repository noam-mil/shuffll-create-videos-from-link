-- Create system_settings table for global platform settings
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only system admins can read and manage settings
CREATE POLICY "System admins can view all settings"
ON public.system_settings FOR SELECT
USING (is_system_admin());

CREATE POLICY "System admins can manage settings"
ON public.system_settings FOR ALL
USING (is_system_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
('general', '{"platformName": "AI Video Creator", "supportEmail": "", "maintenanceMode": false, "selfRegistration": false}', 'General platform settings'),
('security', '{"requireMfa": false, "autoLockout": true, "sessionTimeout": 60, "maxLoginAttempts": 5}', 'Security settings'),
('notifications', '{"emailNotifications": true, "dailyReport": false, "adminAlerts": true}', 'Notification settings'),
('email', '{"smtpHost": "", "smtpPort": 587, "smtpUser": "", "fromEmail": "", "configured": false}', 'Email/SMTP settings');

-- Remove branding columns from meta_organizations (branding is only per sub-org)
ALTER TABLE public.meta_organizations 
DROP COLUMN IF EXISTS primary_color,
DROP COLUMN IF EXISTS secondary_color,
DROP COLUMN IF EXISTS accent_color,
DROP COLUMN IF EXISTS font_family,
DROP COLUMN IF EXISTS logo_url,
DROP COLUMN IF EXISTS favicon_url;