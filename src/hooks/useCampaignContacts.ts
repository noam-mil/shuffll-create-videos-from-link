import { useQuery } from '@tanstack/react-query';
import { callN8nProxy, getN8nTestMode } from './useMessagingHub';

export interface CampaignContact {
  row_number: number;
  ID: number;
  'To send': string;
  'Is sent': string;
  'Sent On Date': string;
  'To Render': string;
  'First Name': string;
  'Last Name': string;
  'Send Date': string;
  'Celebration date': string;
  'Exported video MP4': string;
  'Exported video DASH': string;
  'HTML link': string;
  'Phone number': string;
  'Redirect button URL ': string;
  'Primary color ': string;
  'Thumbnail image': string;
  'Review ': string;
  'Dynamic Values': string;
  'Project ID': string;
  'Project url': string;
  'Export Started At': string;
}

export const useCampaignContacts = (
  metaOrgId: string | null,
  campaignId: string | undefined,
  specificName?: string
) => {
  return useQuery({
    queryKey: ['campaign-contacts', metaOrgId, campaignId, specificName, getN8nTestMode()],
    queryFn: () => {
      const params = new URLSearchParams({ campaignId: campaignId! });
      if (specificName) {
        params.set('specificName', specificName);
      }
      return callN8nProxy<CampaignContact[]>(
        metaOrgId!,
        `/campaign/contacts?${params}`,
        getN8nTestMode()
      );
    },
    enabled: !!metaOrgId && !!campaignId,
    staleTime: 30 * 1000,
  });
};
