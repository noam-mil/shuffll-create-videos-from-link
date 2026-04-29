import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DailyMessage, DayStatusEntry, callN8nProxy, getN8nTestMode } from '@/hooks/useMessagingHub';

interface DailyViewTableProps {
  messages: DailyMessage[] | undefined;
  isLoading: boolean;
  error: string | null;
  metaOrgId: string;
  date: string;
}

const statusColors: Record<string, string> = {
  accepted: 'bg-blue-50 text-blue-700 border-blue-200',
  scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
  queued: 'bg-orange-50 text-orange-700 border-orange-200',
  sending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  sent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  delivery_unknown: 'bg-gray-100 text-gray-700 border-gray-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  read: 'bg-blue-100 text-blue-800 border-blue-200',
  undelivered: 'bg-red-100 text-red-800 border-red-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

const splitPhone = (phone: string): { countryCode: string; number: string } => {
  const cleaned = phone.replace(/\s+/g, '');
  // Match leading + and 1-3 digit country code
  const match = cleaned.match(/^(\+\d{1,3})(.+)$/);
  if (match) {
    return { countryCode: match[1], number: match[2] };
  }
  return { countryCode: '', number: cleaned };
};

const toCsv = (entries: DayStatusEntry[]): string => {
  const header = 'country_code,number,first_name,html_link';
  const rows = entries.map((e) => {
    const { countryCode, number } = splitPhone(e.to_number);
    return `${countryCode},${number},${e.first_name},"${e.html_link.replace(/"/g, '""')}"`;
  });
  // Add BOM for proper Hebrew/Unicode support in Excel
  return '\uFEFF' + [header, ...rows].join('\n');
};

const downloadBlob = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const DailyViewTable = ({ messages, isLoading, error, metaOrgId, date }: DailyViewTableProps) => {
  const { t } = useTranslation();
  const [loadingRow, setLoadingRow] = useState<string | null>(null);

  const handleDownload = async (row: DailyMessage) => {
    const rowKey = `${row.sent_for_company}-${row.status}`;
    setLoadingRow(rowKey);
    try {
      const params = new URLSearchParams({ date, status: row.status, company: row.sent_for_company });
      const path = `/messages/company/day-status?${params}`;
      const entries = await callN8nProxy<DayStatusEntry[]>(metaOrgId, path, getN8nTestMode());
      const csv = toCsv(entries);
      const filename = `${row.sent_for_company}_${row.status}_${date}.csv`;
      downloadBlob(csv, filename);
    } catch (err: any) {
      toast.error(err?.message || t('messagingHub.errors.fetchFailed'));
    } finally {
      setLoadingRow(null);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-destructive">
        {t('messagingHub.errors.fetchFailed')}: {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-muted-foreground text-sm">
          {t('messagingHub.dailyView.loading')}
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const hasData = messages && messages.length > 0 && messages.some(m => m.sent_for_company && m.status);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('messagingHub.dailyView.noData')}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('messagingHub.dailyView.company')}</TableHead>
          <TableHead>{t('messagingHub.dailyView.status')}</TableHead>
          <TableHead className="text-end">{t('messagingHub.dailyView.count')}</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages.map((row, idx) => {
          const prevCompany = idx > 0 ? messages[idx - 1].sent_for_company : null;
          const isNewCompany = row.sent_for_company !== prevCompany;
          const rowKey = `${row.sent_for_company}-${row.status}`;
          const isDownloading = loadingRow === rowKey;

          return (
            <TableRow key={rowKey}>
              <TableCell className="font-medium">
                {isNewCompany ? row.sent_for_company : ''}
              </TableCell>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={statusColors[row.status] ?? 'bg-muted text-foreground'}
                      >
                        {t(`messagingHub.dailyView.statuses.${row.status}`, row.status)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{row.status}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell className="text-end tabular-nums">
                {Number(row.count).toLocaleString()}
              </TableCell>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isDownloading}
                        onClick={() => handleDownload(row)}
                      >
                        {isDownloading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('messagingHub.dailyView.download')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
