import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { subDays, addDays, format, isToday } from 'date-fns';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { OrgLayout } from '@/components/layouts/OrgLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompaniesTable } from '@/components/messaging/CompaniesTable';
import { DailyViewTable } from '@/components/messaging/DailyViewTable';
import { MessagesTable } from '@/components/messaging/MessagesTable';
import { DateRangePicker } from '@/components/messaging/DateRangePicker';
import { useCompanies, useCompanyMessages, useDailyMessages, getN8nTestMode, setN8nTestMode } from '@/hooks/useMessagingHub';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQueryClient } from '@tanstack/react-query';

type ViewMode = 'daily' | 'companies';

const OrgMessagingHub = () => {
  const { t } = useTranslation();
  const { metaOrganization } = useOrganization();
  const metaOrgId = metaOrganization?.id ?? null;
  const queryClient = useQueryClient();
  const [testMode, setTestMode] = useState(getN8nTestMode);

  const handleTestModeToggle = useCallback((enabled: boolean) => {
    setN8nTestMode(enabled);
    setTestMode(enabled);
    queryClient.invalidateQueries({ queryKey: ['messaging-companies'] });
    queryClient.invalidateQueries({ queryKey: ['messaging-messages'] });
    queryClient.invalidateQueries({ queryKey: ['messaging-daily'] });
  }, [queryClient]);

  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 3),
    to: new Date(),
  }));

  const dateRangeFormatted = useMemo(() => ({
    startDate: format(dateRange.from, 'yyyy-MM-dd'),
    endDate: format(dateRange.to, 'yyyy-MM-dd'),
  }), [dateRange]);

  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  const isCompaniesMode = viewMode === 'companies';

  const {
    data: companies,
    isLoading: companiesLoading,
    error: companiesError,
  } = useCompanies(metaOrgId, isCompaniesMode);

  const {
    data: messages,
    isLoading: messagesLoading,
    error: messagesError,
  } = useCompanyMessages(metaOrgId, selectedCompany, dateRangeFormatted, isCompaniesMode);

  const {
    data: dailyMessages,
    isLoading: dailyLoading,
    error: dailyError,
  } = useDailyMessages(metaOrgId, selectedDateStr);

  const handleCompanyClick = (companyName: string) => {
    setSelectedCompany(companyName);
  };

  const handleBackClick = () => {
    setSelectedCompany(null);
  };

  const isRtl = document.documentElement.dir === 'rtl';
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  const renderDailyView = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{t('messagingHub.dailyView.title')}</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
          >
            <PrevIcon className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium">
            {format(selectedDate, 'PPP')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            disabled={isToday(selectedDate)}
          >
            <NextIcon className="h-4 w-4" />
          </Button>
          {!isToday(selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              {t('messagingHub.dailyView.today')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <DailyViewTable
          messages={dailyMessages}
          isLoading={dailyLoading}
          error={dailyError?.message ?? null}
          metaOrgId={metaOrgId!}
          date={selectedDateStr}
        />
      </CardContent>
    </Card>
  );

  const renderCompaniesView = () => {
    if (selectedCompany) {
      return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackClick}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle>
                {t('messagingHub.messages.title', { company: selectedCompany })}
              </CardTitle>
            </div>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </CardHeader>
          <CardContent>
            <MessagesTable
              messages={messages}
              isLoading={messagesLoading}
              error={messagesError?.message ?? null}
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('messagingHub.companies.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <CompaniesTable
            companies={companies}
            isLoading={companiesLoading}
            error={companiesError?.message ?? null}
            onCompanyClick={handleCompanyClick}
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <OrgLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('messagingHub.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('messagingHub.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="test-mode" className="text-sm text-muted-foreground">Test</Label>
            <Switch
              id="test-mode"
              checked={testMode}
              onCheckedChange={handleTestModeToggle}
            />
            {testMode && (
              <Badge variant="outline" className="border-orange-500 text-orange-500">
                Test Mode
              </Badge>
            )}
          </div>
        </div>

        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="daily">{t('messagingHub.dailyView.tab')}</TabsTrigger>
            <TabsTrigger value="companies">{t('messagingHub.companiesTab')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === 'daily' ? renderDailyView() : renderCompaniesView()}
      </div>
    </OrgLayout>
  );
};

export default OrgMessagingHub;
