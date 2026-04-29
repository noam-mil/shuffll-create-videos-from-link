import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrgLayout } from '@/components/layouts/OrgLayout';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Palette, Shield, Plus, FileSpreadsheet, Trash2, Settings, Film } from 'lucide-react';
import { toast } from 'sonner';
import { OrganizationsTab } from '@/components/org/OrganizationsTab';
import { MembersTab } from '@/components/org/MembersTab';
import { MetaOrgLogoUpload } from '@/components/org/MetaOrgLogoUpload';
import { OrgTemplatesTab } from '@/components/org/OrgTemplatesTab';

type ExcelFieldType = 'first_name' | 'full_name' | 'phone_number' | 'email' | 'celebration_date' | '';

interface ExcelFieldSetting {
  id?: string;
  field_name: string;
  field_type: ExcelFieldType;
  is_mandatory: boolean;
  correct_year: boolean;
  allow_empty: boolean;
  regex_pattern: string | null;
}

const OrgAdmin = () => {
  const { t } = useTranslation();
  const { metaOrganization, currentOrg, organizations } = useOrganization();
  const { getMetaOrgRole, isSystemAdmin } = useAuth();

  const userRole = metaOrganization ? getMetaOrgRole(metaOrganization.id) : null;
  const canManage = userRole === 'system_admin' || userRole === 'meta_org_admin' || userRole === 'org_admin';

  const FIELD_TYPES: ExcelFieldType[] = ['first_name', 'full_name', 'phone_number', 'email', 'celebration_date'];

  const [excelSettings, setExcelSettings] = useState<ExcelFieldSetting[]>([]);
  
  // Get branding from current sub-org or defaults
  const branding = currentOrg ? {
    logoUrl: currentOrg.logo_url,
    primaryColor: currentOrg.primary_color || '#00DBDB',
    secondaryColor: currentOrg.secondary_color || '#CEE95C',
    accentColor: currentOrg.accent_color || '#FF6D66',
    fontFamily: currentOrg.font_family || 'system-ui',
  } : {
    logoUrl: null,
    primaryColor: '#00DBDB',
    secondaryColor: '#CEE95C',
    accentColor: '#FF6D66',
    fontFamily: 'system-ui',
  };


  // Fetch excel settings
  const targetId = currentOrg?.id || metaOrganization?.id;
  const targetType = currentOrg ? 'organization' : 'meta_organization';

  const { data: savedExcelSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['excel-settings', targetId, targetType],
    queryFn: async () => {
      if (!targetId) return [];
      
      const query = currentOrg
        ? supabase.from('organization_excel_settings').select('*').eq('organization_id', targetId)
        : supabase.from('organization_excel_settings').select('*').eq('meta_organization_id', targetId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetId && canManage,
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (savedExcelSettings) {
      const mappedSettings = savedExcelSettings.map((s: any) => ({
        id: s.id,
        field_name: s.field_name || '',
        field_type: s.field_type as ExcelFieldType,
        is_mandatory: s.is_mandatory,
        correct_year: s.correct_year,
        allow_empty: s.allow_empty ?? true,
        regex_pattern: s.regex_pattern || null
      }));
      setExcelSettings(mappedSettings);
    }
  }, [savedExcelSettings]);

  const queryClient = useQueryClient();

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: ExcelFieldSetting[]) => {
      if (!targetId) throw new Error('No target ID');
      
      // Filter out empty field names
      const validSettings = settings.filter(s => s.field_name.trim() !== '');
      
      // Delete existing settings
      const deleteQuery = currentOrg
        ? supabase.from('organization_excel_settings').delete().eq('organization_id', targetId)
        : supabase.from('organization_excel_settings').delete().eq('meta_organization_id', targetId);
      
      await deleteQuery;

      if (validSettings.length === 0) return;

      // Insert new settings
      const inserts = validSettings.map(setting => ({
        field_name: setting.field_name,
        field_type: setting.field_type || 'first_name',
        is_mandatory: setting.is_mandatory,
        correct_year: setting.correct_year,
        allow_empty: setting.allow_empty,
        regex_pattern: setting.regex_pattern || null,
        ...(currentOrg ? { organization_id: targetId } : { meta_organization_id: targetId })
      }));

      const { error } = await supabase.from('organization_excel_settings').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('org.admin.settingsSaved'));
      queryClient.invalidateQueries({ queryKey: ['excel-settings'] });
    },
    onError: () => {
      toast.error(t('org.admin.settingsSaveError'));
    }
  });

  const addNewField = () => {
    setExcelSettings(prev => [...prev, {
      field_name: '',
      field_type: '' as ExcelFieldType,
      is_mandatory: false,
      correct_year: false,
      allow_empty: true,
      regex_pattern: null
    }]);
  };

  const removeField = (index: number) => {
    setExcelSettings(prev => prev.filter((_, i) => i !== index));
  };

  const updateFieldSetting = (index: number, key: keyof ExcelFieldSetting, value: any) => {
    setExcelSettings(prev => prev.map((setting, i) => {
      if (i !== index) return setting;
      const updated = { ...setting, [key]: value };
      // Reset correct_year if field_type is not celebration_date
      if (key === 'field_type' && value !== 'celebration_date') {
        updated.correct_year = false;
      }
      return updated;
    }));
  };

  const getFieldTypeLabel = (fieldType: ExcelFieldType): string => {
    const labels: Record<ExcelFieldType, string> = {
      '': t('org.admin.selectFieldType'),
      'first_name': t('org.admin.firstName'),
      'full_name': t('org.admin.fullName'),
      'phone_number': t('org.admin.phoneNumber'),
      'email': t('org.admin.email'),
      'celebration_date': t('org.admin.celebrationDate')
    };
    return labels[fieldType];
  };

  if (!canManage) {
    return (
      <OrgLayout>
        <div className="container mx-auto px-6 py-12 text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('org.admin.noPermission')}</h1>
          <p className="text-muted-foreground">{t('org.admin.noPermissionDesc')}</p>
        </div>
      </OrgLayout>
    );
  }

  return (
    <OrgLayout>
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('org.admin.title')}</h1>
          <p className="text-muted-foreground">
            {t('org.admin.subtitle', { name: metaOrganization?.name })}
          </p>
        </div>

        <Tabs defaultValue="organizations" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="organizations" className="gap-2">
              <Building2 className="w-4 h-4" />
              {t('org.admin.orgs.tabTitle')}
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              {t('org.admin.members.tabTitle')}
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="w-4 h-4" />
              {t('org.admin.branding')}
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Film className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="excel" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              {t('org.admin.excelSettings')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              {t('org.admin.settings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizations">
            {metaOrganization && (
              <OrganizationsTab 
                metaOrgId={metaOrganization.id} 
                metaOrgSlug={metaOrganization.slug} 
              />
            )}
          </TabsContent>

          <TabsContent value="members">
            {metaOrganization && (
              <MembersTab metaOrgId={metaOrganization.id} />
            )}
          </TabsContent>

          <TabsContent value="templates">
            {metaOrganization && (
              <OrgTemplatesTab metaOrgId={metaOrganization.id} />
            )}
          </TabsContent>

          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>{t('org.admin.orgBranding')}</CardTitle>
                <CardDescription>{t('org.admin.brandingDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!currentOrg ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('org.admin.selectOrgForBranding')}</p>
                    <p className="text-sm">{t('org.admin.brandingPerOrg')}</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>{t('org.admin.orgLogo')}</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                        {branding.logoUrl ? (
                          <img src={branding.logoUrl} alt="Logo" className="h-16 mx-auto" />
                        ) : (
                          <>
                            <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">{t('org.admin.dragDropImage')}</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>{t('admin.orgs.primaryColor')}</Label>
                        <div className="flex gap-2">
                          <Input type="color" defaultValue={branding.primaryColor} className="w-12 h-10 p-1" />
                          <Input defaultValue={branding.primaryColor} dir="ltr" className="flex-1" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('admin.orgs.secondaryColor')}</Label>
                        <div className="flex gap-2">
                          <Input type="color" defaultValue={branding.secondaryColor} className="w-12 h-10 p-1" />
                          <Input defaultValue={branding.secondaryColor} dir="ltr" className="flex-1" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('admin.orgs.accentColor')}</Label>
                        <div className="flex gap-2">
                          <Input type="color" defaultValue={branding.accentColor} className="w-12 h-10 p-1" />
                          <Input defaultValue={branding.accentColor} dir="ltr" className="flex-1" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="font">{t('admin.orgs.fontFamily')}</Label>
                      <Input id="font" defaultValue={branding.fontFamily} dir="ltr" />
                    </div>

                    <Button>{t('common.save')}</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="excel">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('org.admin.excelSettings')}</CardTitle>
                    <CardDescription>{t('org.admin.excelSettingsDesc')}</CardDescription>
                  </div>
                  <Button onClick={addNewField} className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('org.admin.addField')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">{t('org.admin.fieldMappings')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t('org.admin.fieldMappingsDesc')}</p>
                  
                  {isLoadingSettings ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">{t('common.loading')}</p>
                    </div>
                  ) : excelSettings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t('org.admin.noFieldMappings')}</p>
                      <p className="text-sm">{t('org.admin.noFieldMappingsHint')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {excelSettings.map((setting, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 border border-border rounded-lg bg-card">
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>{t('org.admin.fieldName')}</Label>
                                <Input
                                  value={setting.field_name}
                                  onChange={(e) => updateFieldSetting(index, 'field_name', e.target.value)}
                                  placeholder={t('org.admin.fieldNamePlaceholder')}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t('org.admin.fieldType')}</Label>
                                <select
                                  value={setting.field_type}
                                  onChange={(e) => updateFieldSetting(index, 'field_type', e.target.value as ExcelFieldType)}
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <option value="">{t('org.admin.selectFieldType')}</option>
                                  {FIELD_TYPES.map(type => (
                                    <option key={type} value={type}>
                                      {getFieldTypeLabel(type)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            <div className="flex items-center flex-wrap gap-6">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={setting.is_mandatory}
                                  onCheckedChange={(checked) => updateFieldSetting(index, 'is_mandatory', checked)}
                                />
                                <Label className="cursor-pointer">{t('org.admin.mandatory')}</Label>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={!setting.allow_empty}
                                  onCheckedChange={(checked) => updateFieldSetting(index, 'allow_empty', !checked)}
                                />
                                <div className="flex flex-col">
                                  <Label className="cursor-pointer">{t('org.admin.noEmptyValues')}</Label>
                                  <span className="text-xs text-muted-foreground">
                                    {t('org.admin.noEmptyValuesHint')}
                                  </span>
                                </div>
                              </div>
                              
                              {setting.field_type === 'celebration_date' && (
                                <div className="flex items-center gap-2 ps-4 border-s border-border">
                                  <Switch
                                    checked={setting.correct_year}
                                    onCheckedChange={(checked) => updateFieldSetting(index, 'correct_year', checked)}
                                  />
                                  <div className="flex flex-col">
                                    <Label className="cursor-pointer">{t('org.admin.correctYear')}</Label>
                                    <span className="text-xs text-muted-foreground">
                                      {t('org.admin.correctYearHint')}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Regex Pattern */}
                            <div className="space-y-2 pt-2 border-t border-border">
                              <div className="flex items-center gap-2">
                                <Label>{t('org.admin.regexPattern')}</Label>
                                <span className="text-xs text-muted-foreground">
                                  ({t('org.admin.optional')})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => updateFieldSetting(index, 'regex_pattern', '^\\d{4}-\\d{2}-\\d{2}$')}
                                >
                                  {t('org.admin.presetIsoDate', 'ISO Date (YYYY-MM-DD)')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => updateFieldSetting(index, 'regex_pattern', '^[\\d\\s\\-\\+\\(\\)]{8,}$')}
                                >
                                  {t('org.admin.presetPhone', 'Phone (8+ digits)')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => updateFieldSetting(index, 'regex_pattern', '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$')}
                                >
                                  {t('org.admin.presetEmail', 'Email')}
                                </Button>
                                {setting.regex_pattern && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7 text-muted-foreground"
                                    onClick={() => updateFieldSetting(index, 'regex_pattern', null)}
                                  >
                                    {t('org.admin.clearPattern', 'Clear')}
                                  </Button>
                                )}
                              </div>
                              <Input
                                value={setting.regex_pattern || ''}
                                onChange={(e) => updateFieldSetting(index, 'regex_pattern', e.target.value || null)}
                                placeholder={t('org.admin.regexPlaceholder')}
                                dir="ltr"
                                className="font-mono text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                {t('org.admin.regexHint')}
                              </p>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeField(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => saveSettingsMutation.mutate(excelSettings)}
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending ? t('admin.settingsPage.saving') : t('common.save')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{t('org.admin.orgSettings')}</CardTitle>
                <CardDescription>{t('org.admin.settingsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Meta Org Logo Upload */}
                {metaOrganization && (
                  <MetaOrgLogoUpload 
                    metaOrganization={metaOrganization} 
                    onLogoUpdated={() => {
                      window.location.reload();
                    }}
                  />
                )}

                {/* Show Dummy Templates Toggle */}
                {metaOrganization && (
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <Label className="text-base">{t('org.admin.showDummyTemplates', 'Show demo templates')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('org.admin.showDummyTemplatesDesc', 'Display sample templates on the homepage for demonstration purposes')}
                      </p>
                    </div>
                    <Switch
                      checked={metaOrganization.show_dummy_templates}
                      onCheckedChange={async (checked) => {
                        const { error } = await supabase
                          .from('meta_organizations')
                          .update({ show_dummy_templates: checked })
                          .eq('id', metaOrganization.id);
                        if (error) {
                          toast.error(t('org.admin.settingsSaveError'));
                        } else {
                          toast.success(t('org.admin.settingsSaved'));
                          queryClient.invalidateQueries({ queryKey: ['meta-organization'] });
                          window.location.reload();
                        }
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">{t('admin.orgs.orgName')}</Label>
                    <Input id="org-name" defaultValue={currentOrg?.name || metaOrganization?.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-slug">{t('admin.orgs.urlId')}</Label>
                    <Input 
                      id="org-slug" 
                      defaultValue={currentOrg?.slug || metaOrganization?.slug} 
                      dir="ltr" 
                      className="text-left"
                      disabled={!isSystemAdmin}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-domain">{t('admin.metaOrgs.customDomain')}</Label>
                  <Input 
                    id="custom-domain" 
                    defaultValue={metaOrganization?.custom_domain || ''} 
                    placeholder="videos.company.com"
                    dir="ltr" 
                    className="text-left" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('org.admin.favicon')}</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t('org.admin.faviconHint')}</p>
                  </div>
                </div>

                <Button>{t('common.save')}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </OrgLayout>
  );
};

export default OrgAdmin;
