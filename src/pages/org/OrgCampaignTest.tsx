import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OrgLayout } from '@/components/layouts/OrgLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FlaskConical, Search, Loader2, ExternalLink, Send, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useMetaOrganization } from '@/contexts/OrganizationContext';
import { useCampaignContacts } from '@/hooks/useCampaignContacts';
import { callN8nProxy, getN8nTestMode } from '@/hooks/useMessagingHub';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const OrgCampaignTest = () => {
  const { t, i18n } = useTranslation();
  const { campaignId } = useParams<{ campaignId: string }>();
  const { metaOrganization } = useMetaOrganization();
  const [searchInput, setSearchInput] = useState('');
  const [specificName, setSpecificName] = useState<string | undefined>();
  const [phoneOverrides, setPhoneOverrides] = useState<Record<number, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [newNumbers, setNewNumbers] = useState<string[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  const STORAGE_KEY = `campaign-test-sent-numbers-${campaignId}`;

  const getSentNumbers = (): string[] => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  };

  const saveSentNumbers = (numbers: string[]) => {
    const existing = getSentNumbers();
    const merged = Array.from(new Set([...existing, ...numbers]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  };

  const { data: contacts, isLoading, error } = useCampaignContacts(
    metaOrganization?.id ?? null,
    campaignId,
    specificName
  );

  const normalizedContacts = Array.isArray(contacts) ? contacts : contacts ? [contacts] : [];
  const validContacts = normalizedContacts.filter(
    (c) => c && typeof c === 'object' && Object.keys(c).length > 1
  );

  const testEntries = Object.entries(phoneOverrides)
    .filter(([, phone]) => phone.trim() !== '')
    .map(([id, phone]) => ({ contactId: Number(id), phoneNumber: phone.trim() }));

  const handleSendTest = () => {
    if (!metaOrganization?.id || !campaignId || testEntries.length === 0) return;
    const sentBefore = getSentNumbers();
    const unseenNumbers = testEntries
      .map((e) => e.phoneNumber)
      .filter((n) => !sentBefore.includes(n));
    if (unseenNumbers.length > 0) {
      setNewNumbers(unseenNumbers);
      setPendingConfirm(true);
    } else {
      executeSend();
    }
  };

  const executeSend = async () => {
    if (!metaOrganization?.id || !campaignId) return;
    setIsSending(true);
    try {
      const params = new URLSearchParams({ campaignId: campaignId! });
      params.set('test', JSON.stringify(testEntries));
      await callN8nProxy(
        metaOrganization.id,
        `/campaign/test?${params}`,
        getN8nTestMode(),
        'GET'
      );
      saveSentNumbers(testEntries.map((e) => e.phoneNumber));
      setPhoneOverrides({});
      toast.success(t('campaignTest.testSentSuccess', { count: testEntries.length }));
    } catch (err: any) {
      toast.error(err.message || t('campaignTest.testSentError'));
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmSend = () => {
    setPendingConfirm(false);
    setNewNumbers([]);
    executeSend();
  };

  const handleSearch = () => {
    setSpecificName(searchInput.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <OrgLayout>
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-primary" />
            Campaign Test
          </h1>
          <p className="text-muted-foreground">
            Campaign ID: <code className="bg-muted px-2 py-1 rounded text-sm">{campaignId}</code>
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                placeholder="Search by name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="max-w-sm"
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contacts {validContacts.length > 0 && `(${validContacts.length})`}</CardTitle>
            <Button onClick={handleSendTest} disabled={isSending || testEntries.length === 0}>
              {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Test ({testEntries.length})
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <p className="text-destructive text-center py-8">
                Failed to load contacts. Please try again.
              </p>
            )}

            {!isLoading && !error && validContacts.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No contacts found.</p>
            )}

            {!isLoading && validContacts.length > 0 && (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ready</TableHead>
                      <TableHead>#</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Send Date</TableHead>
                      <TableHead>To Send</TableHead>
                      <TableHead>Is Sent</TableHead>
                      <TableHead>To Render</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Video</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validContacts.map((contact, idx) => {
                      const isReady = !!contact['HTML link'];
                      return (
                      <TableRow key={contact.ID ?? idx}>
                        <TableCell>
                          {isReady ? (
                            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold">
                              <CheckCircle2 className="w-4 h-4" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive px-2.5 py-1 rounded-full text-xs font-semibold">
                              <XCircle className="w-4 h-4" />
                              Not Ready
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{contact.row_number}</TableCell>
                        <TableCell>{contact['First Name']}</TableCell>
                        <TableCell>{contact['Last Name']}</TableCell>
                        <TableCell>
                          {isReady ? (
                            <Input
                              placeholder={contact['Phone number'] || 'Enter phone...'}
                              value={phoneOverrides[contact.ID] ?? ''}
                              onChange={(e) =>
                                setPhoneOverrides((prev) => ({ ...prev, [contact.ID]: e.target.value }))
                              }
                              className="w-36 h-8 text-sm"
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>{contact['Send Date']}</TableCell>
                        <TableCell>{contact['To send']}</TableCell>
                        <TableCell>{contact['Is sent']}</TableCell>
                        <TableCell>{contact['To Render']}</TableCell>
                        <TableCell>{contact['Review ']}</TableCell>
                        <TableCell>
                          {contact['HTML link'] && (
                            <a
                              href={contact['HTML link']}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={pendingConfirm} onOpenChange={setPendingConfirm}>
        <AlertDialogContent dir={i18n.dir()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              {t('campaignTest.newNumbersTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-start">
                <p className="mb-3">{t('campaignTest.newNumbersDescription')}</p>
                <ul className="list-disc space-y-1 bg-muted p-3 rounded-md text-sm font-mono" dir="ltr" style={{ paddingInlineStart: '2rem' }}>
                  {newNumbers.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <p className="mt-3">{t('campaignTest.newNumbersConfirm')}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>
              {t('campaignTest.confirmSend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OrgLayout>
  );
};

export default OrgCampaignTest;
