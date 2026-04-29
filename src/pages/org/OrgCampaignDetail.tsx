import { useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { OrgLayout } from '@/components/layouts/OrgLayout';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaign, useCampaignEntries, useUpdateCampaign, useAddCampaignEntries } from '@/hooks/useCampaigns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Megaphone, Users, Loader2, Image, Upload, FileSpreadsheet, Play } from 'lucide-react';
import { toast } from 'sonner';
import {
  CAMPAIGN_CLIENT_STATUS,
  CAMPAIGN_SYSTEM_STATUS,
  CLIENT_STATUS_KEYS,
  SYSTEM_STATUS_KEYS,
  CLIENT_STATUS_COLORS,
  SYSTEM_STATUS_COLORS,
  type CampaignClientStatus,
  type CampaignSystemStatus,
} from '@/types/campaign';
import { getTemplateById, getCategoryLabel } from '@/lib/templates';
import { CampaignCsvUploadDialog } from '@/components/CampaignCsvUploadDialog';

const OrgCampaignDetail = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { campaignId } = useParams<{ campaignId: string }>();
  const { metaOrganization, currentOrg } = useOrganization();
  const { getMetaOrgRole } = useAuth();

  const userRole = metaOrganization ? getMetaOrgRole(metaOrganization.id) : null;
  const canManage = userRole === 'system_admin' || userRole === 'meta_org_admin' || userRole === 'org_admin';

  const { data: campaign, isLoading: isLoadingCampaign } = useCampaign({ campaignId });
  const { data: entries, isLoading: isLoadingEntries } = useCampaignEntries({ campaignId });
  const updateCampaign = useUpdateCampaign();
  const addEntries = useAddCampaignEntries();

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Get template info
  const template = getTemplateById(campaign?.template_id);

  // Extract unique column headers from all entries
  const columnHeaders = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    const headers = new Set<string>();
    entries.forEach((entry) => {
      Object.keys(entry.data || {}).forEach((key) => headers.add(key));
    });
    return Array.from(headers);
  }, [entries]);

  const handleUpdateClientStatus = async (status: CampaignClientStatus) => {
    if (!campaign) return;
    try {
      await updateCampaign.mutateAsync({ id: campaign.id, client_status: status });
      toast.success(t('campaigns.statusUpdated'));
    } catch {
      toast.error(t('campaigns.statusUpdateError'));
    }
  };

  const handleUpdateSystemStatus = async (status: CampaignSystemStatus | 'none') => {
    if (!campaign) return;
    try {
      await updateCampaign.mutateAsync({
        id: campaign.id,
        system_status: status === 'none' ? null : status,
      });
      toast.success(t('campaigns.statusUpdated'));
    } catch {
      toast.error(t('campaigns.statusUpdateError'));
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setCsvDialogOpen(true);
      if (csvInputRef.current) {
        csvInputRef.current.value = "";
      }
    }
  };

  const handleCsvConfirm = async (data: Record<string, string>[]) => {
    if (!campaignId || data.length === 0) return;
    
    try {
      await addEntries.mutateAsync({
        campaignId,
        entries: data,
      });
      toast.success(t('campaigns.entries.uploadSuccess', { count: data.length }));
      setCsvDialogOpen(false);
      setCsvFile(null);
    } catch {
      toast.error(t('campaigns.entries.uploadError'));
    }
  };

  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  if (isLoadingCampaign) {
    return (
      <OrgLayout>
        <div className="container mx-auto px-6 py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </OrgLayout>
    );
  }

  if (!campaign) {
    return (
      <OrgLayout>
        <div className="container mx-auto px-6 py-12 text-center">
          <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('campaigns.notFound')}</h1>
          <Link to={`/${metaOrganization?.slug}/campaigns`}>
            <Button variant="outline" className="gap-2 mt-4">
              <BackIcon className="w-4 h-4" />
              {t('campaigns.backToList')}
            </Button>
          </Link>
        </div>
      </OrgLayout>
    );
  }

  return (
    <OrgLayout>
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to={`/${metaOrganization?.slug}/campaigns`}>
            <Button variant="ghost" className="gap-2 mb-4 -ms-3">
              <BackIcon className="w-4 h-4" />
              {t('campaigns.backToList')}
            </Button>
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <Megaphone className="w-8 h-8 text-primary" />
                {campaign.name}
              </h1>
              <p className="text-muted-foreground">
                {t('campaigns.createdAt', {
                  date: new Date(campaign.created_at).toLocaleDateString(),
                })}
              </p>
            </div>

            {/* Upload Excel Button */}
            {canManage && (
              <div>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleCsvUpload}
                  className="hidden"
                  id="campaign-csv-upload"
                />
                <label htmlFor="campaign-csv-upload">
                  <Button variant="outline" className="gap-2 cursor-pointer" asChild>
                    <span>
                      <Upload className="w-4 h-4" />
                      {t('campaigns.uploadExcel')}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Template/Creative Card */}
        {template && (
          <Card className="mb-8 overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {/* Thumbnail */}
              <div className="relative sm:w-64 h-40 sm:h-auto flex-shrink-0">
                <img
                  src={template.poster}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 start-3 flex items-center gap-2">
                  <Badge className="bg-primary/90 text-primary-foreground">
                    <Play className="w-3 h-3 me-1" />
                    {template.realism}
                  </Badge>
                </div>
              </div>
              
              {/* Info */}
              <CardContent className="flex-1 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{getCategoryLabel(template.category, t)}</Badge>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {template.name}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('campaigns.selectedCreative')}
                </p>
              </CardContent>
            </div>
          </Card>
        )}

        {/* Status Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Client Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('campaigns.table.clientStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              {canManage ? (
                <Select
                  value={campaign.client_status}
                  onValueChange={(value) => handleUpdateClientStatus(value as CampaignClientStatus)}
                  disabled={updateCampaign.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CAMPAIGN_CLIENT_STATUS).map((status) => (
                      <SelectItem key={status} value={status}>
                        <Badge className={`${CLIENT_STATUS_COLORS[status]} border-0`}>
                          {t(CLIENT_STATUS_KEYS[status])}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={`${CLIENT_STATUS_COLORS[campaign.client_status]} border-0`}>
                  {t(CLIENT_STATUS_KEYS[campaign.client_status])}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('campaigns.table.systemStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              {canManage ? (
                <Select
                  value={campaign.system_status || 'none'}
                  onValueChange={(value) =>
                    handleUpdateSystemStatus(value as CampaignSystemStatus | 'none')
                  }
                  disabled={updateCampaign.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">{t('common.none')}</span>
                    </SelectItem>
                    {Object.values(CAMPAIGN_SYSTEM_STATUS).map((status) => (
                      <SelectItem key={status} value={status}>
                        <Badge className={`${SYSTEM_STATUS_COLORS[status]} border-0`}>
                          {t(SYSTEM_STATUS_KEYS[status])}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : campaign.system_status ? (
                <Badge className={`${SYSTEM_STATUS_COLORS[campaign.system_status]} border-0`}>
                  {t(SYSTEM_STATUS_KEYS[campaign.system_status])}
                </Badge>
              ) : (
                <span className="text-muted-foreground">{t('common.none')}</span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* No Template Selected Card */}
        {!template && (
          <Card className="mb-8 border-dashed">
            <CardContent className="py-8 text-center">
              <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">{t('campaigns.noTemplate')}</p>
              <p className="text-sm text-muted-foreground">{t('campaigns.noTemplateHint')}</p>
            </CardContent>
          </Card>
        )}

        {/* Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('campaigns.entries.title')}
            </CardTitle>
            <CardDescription>
              {t('campaigns.entries.description', { count: entries?.length || 0 })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEntries ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !entries || entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('campaigns.entries.empty')}</p>
                <p className="text-sm mb-4">{t('campaigns.entries.emptyHint')}</p>
                {canManage && (
                  <label htmlFor="campaign-csv-upload">
                    <Button variant="outline" className="gap-2 cursor-pointer" asChild>
                      <span>
                        <Upload className="w-4 h-4" />
                        {t('campaigns.uploadExcel')}
                      </span>
                    </Button>
                  </label>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {columnHeaders.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        {columnHeaders.map((header) => (
                          <TableCell key={header}>
                            {String((entry.data as Record<string, unknown>)?.[header] ?? '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CSV Upload Dialog */}
      {csvFile && (
        <CampaignCsvUploadDialog
          open={csvDialogOpen}
          onOpenChange={setCsvDialogOpen}
          file={csvFile}
          onConfirm={handleCsvConfirm}
          isUploading={addEntries.isPending}
        />
      )}
    </OrgLayout>
  );
};

export default OrgCampaignDetail;
