import { useTranslation } from 'react-i18next';
import { OrgLayout } from '@/components/layouts/OrgLayout';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useApiCampaigns, type ApiCampaign } from '@/hooks/useCampaignsApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Megaphone, Building2, Loader2, ExternalLink, FlaskConical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SEND_STATUS_COLORS: Record<string, string> = {
  Send: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'Dont Send': 'bg-red-500/15 text-red-700 dark:text-red-400',
};

const OrgCampaigns = () => {
  const { t } = useTranslation();
  const { metaOrganization } = useOrganization();
  const { isSystemAdmin } = useAuth();
  const navigate = useNavigate();

  const { data: campaigns, isLoading } = useApiCampaigns(metaOrganization?.id ?? null);

  if (!metaOrganization) {
    return (
      <OrgLayout>
        <div className="container mx-auto px-6 py-12 text-center">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('campaigns.selectOrg')}</h1>
          <p className="text-muted-foreground">{t('campaigns.selectOrgDesc')}</p>
        </div>
      </OrgLayout>
    );
  }

  return (
    <OrgLayout>
      <div className="container mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-primary" />
              {t('campaigns.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('campaigns.subtitle', { name: metaOrganization.name })}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('campaigns.listTitle')}</CardTitle>
            <CardDescription>{t('campaigns.listDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !Array.isArray(campaigns) || campaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('campaigns.empty')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('campaigns.table.client')}</TableHead>
                    <TableHead>{t('campaigns.table.event')}</TableHead>
                    <TableHead>{t('campaigns.table.sendStatus')}</TableHead>
                    <TableHead>{t('campaigns.table.sendTime')}</TableHead>
                    <TableHead>{t('campaigns.table.version')}</TableHead>
                    <TableHead>{t('campaigns.table.thumbnail')}</TableHead>
                    <TableHead className="text-end">{t('campaigns.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(campaigns) ? campaigns : []).map((campaign: ApiCampaign) => (
                    <TableRow key={campaign['ID ']}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{campaign['Client ']}</span>
                          {campaign['company name for message'] && (
                            <span className="block text-xs text-muted-foreground">
                              {campaign['company name for message']}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{campaign.Event}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${SEND_STATUS_COLORS[campaign['To send messages']] || 'bg-muted text-muted-foreground'} border-0`}
                        >
                          {campaign['To send messages'] === 'Send'
                            ? t('campaigns.sendStatus.send')
                            : t('campaigns.sendStatus.dontSend')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {campaign['Send time'] || '-'}
                        {campaign['Send before/ after'] && (
                          <span className="block text-xs">
                            {campaign['Send before/ after']}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        v{campaign.Version}
                      </TableCell>
                      <TableCell>
                        {campaign['Message Thumbnail'] ? (
                          <img
                            src={`https://storage.googleapis.com/${campaign['Message Thumbnail']}`}
                            alt={campaign['Client ']}
                            className="w-16 h-10 object-cover rounded border border-border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-end flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`../campaign-test/${campaign['ID ']}`)}
                        >
                          <FlaskConical className="w-4 h-4" />
                        </Button>
                        {isSystemAdmin && campaign['Excel URL'] && (
                          <a
                            href={campaign['Excel URL']}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </OrgLayout>
  );
};

export default OrgCampaigns;
