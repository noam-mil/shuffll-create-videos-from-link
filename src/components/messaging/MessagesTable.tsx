import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Message } from '@/hooks/useMessagingHub';

interface MessagesTableProps {
  messages: Message[] | undefined;
  isLoading: boolean;
  error: string | null;
}

const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status.toLowerCase()) {
    case 'sent':
    case 'delivered':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'failed':
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const MessagesTable = ({
  messages,
  isLoading,
  error,
}: MessagesTableProps) => {
  const { t } = useTranslation();

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
          {t('messagingHub.messages.loading')}
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('messagingHub.messages.noMessages')}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('messagingHub.messages.recipient')}</TableHead>
          <TableHead className="max-w-[300px]">{t('messagingHub.messages.message')}</TableHead>
          <TableHead>{t('messagingHub.messages.status')}</TableHead>
          <TableHead>{t('messagingHub.messages.sentAt')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages.map((msg) => (
          <TableRow key={msg.id}>
            <TableCell className="font-medium">{msg.recipient}</TableCell>
            <TableCell className="max-w-[300px] truncate">{msg.message}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(msg.status)}>
                {msg.status}
              </Badge>
            </TableCell>
            <TableCell>
              {format(new Date(msg.sentAt), 'MMM d, yyyy HH:mm')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
