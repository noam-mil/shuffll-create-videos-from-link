import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Bell, Globe, Mail, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeneralSettings {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  selfRegistration: boolean;
}

interface SecuritySettings {
  requireMfa: boolean;
  autoLockout: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
}

interface NotificationSettings {
  emailNotifications: boolean;
  dailyReport: boolean;
  adminAlerts: boolean;
}

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  fromEmail: string;
  configured: boolean;
}

const AdminSettings = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state for form values
  const [general, setGeneral] = useState<GeneralSettings>({
    platformName: 'AI Video Creator',
    supportEmail: '',
    maintenanceMode: false,
    selfRegistration: false,
  });
  const [security, setSecurity] = useState<SecuritySettings>({
    requireMfa: false,
    autoLockout: true,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    dailyReport: false,
    adminAlerts: true,
  });
  const [email, setEmail] = useState<EmailSettings>({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    fromEmail: '',
    configured: false,
  });
  const [smtpPassword, setSmtpPassword] = useState('');

  // Fetch settings from database
  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (settings) {
      settings.forEach((setting) => {
        const value = setting.value as Record<string, unknown>;
        switch (setting.key) {
          case 'general':
            setGeneral({
              platformName: (value.platformName as string) || 'AI Video Creator',
              supportEmail: (value.supportEmail as string) || '',
              maintenanceMode: (value.maintenanceMode as boolean) || false,
              selfRegistration: (value.selfRegistration as boolean) || false,
            });
            break;
          case 'security':
            setSecurity({
              requireMfa: (value.requireMfa as boolean) || false,
              autoLockout: (value.autoLockout as boolean) ?? true,
              sessionTimeout: (value.sessionTimeout as number) || 60,
              maxLoginAttempts: (value.maxLoginAttempts as number) || 5,
            });
            break;
          case 'notifications':
            setNotifications({
              emailNotifications: (value.emailNotifications as boolean) ?? true,
              dailyReport: (value.dailyReport as boolean) || false,
              adminAlerts: (value.adminAlerts as boolean) ?? true,
            });
            break;
          case 'email':
            setEmail({
              smtpHost: (value.smtpHost as string) || '',
              smtpPort: (value.smtpPort as number) || 587,
              smtpUser: (value.smtpUser as string) || '',
              fromEmail: (value.fromEmail as string) || '',
              configured: (value.configured as boolean) || false,
            });
            break;
        }
      });
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: value as never })
        .eq('key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({ 
        title: t('admin.settingsPage.saved'),
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: isRtl ? 'שגיאה בשמירת ההגדרות' : 'Error saving settings', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleSaveGeneral = () => saveMutation.mutate({ key: 'general', value: general });
  const handleSaveSecurity = () => saveMutation.mutate({ key: 'security', value: security });
  const handleSaveNotifications = () => saveMutation.mutate({ key: 'notifications', value: notifications });
  const handleSaveEmail = () => saveMutation.mutate({ key: 'email', value: email });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('admin.settingsPage.title')}</h1>
          <p className="text-muted-foreground">{t('admin.settingsPage.subtitle')}</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="general" className="gap-2">
              <Globe className="w-4 h-4" />
              {t('admin.settingsPage.general')}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              {t('admin.settingsPage.security')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              {t('admin.settingsPage.notifications')}
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="w-4 h-4" />
              {t('admin.settingsPage.email')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.settingsPage.general')}</CardTitle>
                <CardDescription>
                  {isRtl ? 'הגדרות בסיסיות של הפלטפורמה' : 'Basic platform settings'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">{t('admin.settingsPage.platformName')}</Label>
                  <Input 
                    id="platform-name" 
                    value={general.platformName}
                    onChange={(e) => setGeneral({ ...general, platformName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-email">{t('admin.settingsPage.supportEmail')}</Label>
                  <Input 
                    id="support-email" 
                    type="email" 
                    value={general.supportEmail}
                    onChange={(e) => setGeneral({ ...general, supportEmail: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('admin.settingsPage.maintenanceMode')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.settingsPage.maintenanceModeDesc')}
                    </p>
                  </div>
                  <Switch 
                    checked={general.maintenanceMode}
                    onCheckedChange={(checked) => setGeneral({ ...general, maintenanceMode: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('admin.settingsPage.selfRegistration')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.settingsPage.selfRegistrationDesc')}
                    </p>
                  </div>
                  <Switch 
                    checked={general.selfRegistration}
                    onCheckedChange={(checked) => setGeneral({ ...general, selfRegistration: checked })}
                  />
                </div>
                <Button onClick={handleSaveGeneral} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />
                      {t('admin.settingsPage.saving')}
                    </>
                  ) : (
                    t('admin.settingsPage.saveChanges')
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.settingsPage.security')}</CardTitle>
                <CardDescription>
                  {isRtl ? 'הגדרות אבטחה ופרטיות של הפלטפורמה' : 'Security and privacy settings'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('admin.settingsPage.requireMfa')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.settingsPage.requireMfaDesc')}
                    </p>
                  </div>
                  <Switch 
                    checked={security.requireMfa}
                    onCheckedChange={(checked) => setSecurity({ ...security, requireMfa: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('admin.settingsPage.autoLockout')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.settingsPage.autoLockoutDesc')}
                    </p>
                  </div>
                  <Switch 
                    checked={security.autoLockout}
                    onCheckedChange={(checked) => setSecurity({ ...security, autoLockout: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">{t('admin.settingsPage.sessionTimeout')}</Label>
                  <Input 
                    id="session-timeout" 
                    type="number" 
                    value={security.sessionTimeout}
                    onChange={(e) => setSecurity({ ...security, sessionTimeout: parseInt(e.target.value) || 60 })}
                    dir="ltr"
                    className="w-32"
                  />
                </div>
                <Button onClick={handleSaveSecurity} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />
                      {t('admin.settingsPage.saving')}
                    </>
                  ) : (
                    t('admin.settingsPage.saveChanges')
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.settingsPage.notifications')}</CardTitle>
                <CardDescription>
                  {isRtl ? 'ניהול התראות מערכת' : 'Manage system notifications'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('admin.settingsPage.emailNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.settingsPage.emailNotificationsDesc')}
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('admin.settingsPage.dailyReport')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.settingsPage.dailyReportDesc')}
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.dailyReport}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, dailyReport: checked })}
                  />
                </div>
                <Button onClick={handleSaveNotifications} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />
                      {t('admin.settingsPage.saving')}
                    </>
                  ) : (
                    t('admin.settingsPage.saveChanges')
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.settingsPage.email')}</CardTitle>
                <CardDescription>
                  {isRtl ? 'הגדרות שרת דואר יוצא' : 'Outgoing mail server settings'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">{t('admin.settingsPage.smtpHost')}</Label>
                    <Input 
                      id="smtp-host" 
                      placeholder="smtp.example.com"
                      value={email.smtpHost}
                      onChange={(e) => setEmail({ ...email, smtpHost: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">{t('admin.settingsPage.smtpPort')}</Label>
                    <Input 
                      id="smtp-port" 
                      type="number" 
                      placeholder="587"
                      value={email.smtpPort}
                      onChange={(e) => setEmail({ ...email, smtpPort: parseInt(e.target.value) || 587 })}
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">{t('admin.settingsPage.smtpUser')}</Label>
                    <Input 
                      id="smtp-user"
                      value={email.smtpUser}
                      onChange={(e) => setEmail({ ...email, smtpUser: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-pass">{t('admin.settingsPage.smtpPass')}</Label>
                    <Input 
                      id="smtp-pass" 
                      type="password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">{t('admin.settingsPage.fromEmail')}</Label>
                  <Input 
                    id="from-email" 
                    type="email" 
                    placeholder="noreply@example.com"
                    value={email.fromEmail}
                    onChange={(e) => setEmail({ ...email, fromEmail: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline">{t('admin.settingsPage.testConnection')}</Button>
                  <Button onClick={handleSaveEmail} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />
                        {t('admin.settingsPage.saving')}
                      </>
                    ) : (
                      t('admin.settingsPage.saveChanges')
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
