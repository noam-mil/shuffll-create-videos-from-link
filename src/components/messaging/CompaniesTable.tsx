import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { he, es, ar, de, enUS } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Company } from '@/hooks/useMessagingHub';

interface CompaniesTableProps {
  companies: Company[] | undefined;
  isLoading: boolean;
  error: string | null;
  onCompanyClick: (companyName: string) => void;
}

export const CompaniesTable = ({
  companies,
  isLoading,
  error,
  onCompanyClick,
}: CompaniesTableProps) => {
  const { t, i18n } = useTranslation();
  const dateFnsLocale = { he, es, ar, de, en: enUS }[i18n.language] ?? enUS;

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
          {t('messagingHub.companies.loading')}
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('messagingHub.companies.noCompanies')}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('messagingHub.companies.companyName')}</TableHead>
          <TableHead>{t('messagingHub.companies.lastMessage')}</TableHead>
          <TableHead className="text-end">{t('messagingHub.companies.totalMessages')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.isArray(companies) && companies.map((company) => (
          <TableRow
            key={company.sent_for_company}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onCompanyClick(company.sent_for_company)}
          >
            <TableCell className="font-medium">{company.sent_for_company}</TableCell>
            <TableCell>
              {company.last_sent
                ? formatDistanceToNow(new Date(company.last_sent), { addSuffix: true, locale: dateFnsLocale })
                : '-'}
            </TableCell>
            <TableCell className="text-end">
              {company.total_messages != null ? company.total_messages.toLocaleString() : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
