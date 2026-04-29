import { useQuery } from '@tanstack/react-query';
import { callN8nProxy, getN8nTestMode } from './useMessagingHub';

export interface ApiCampaign {
  row_number: number;
  'ID ': number;
  'Excel URL': string;
  'Client ': string;
  Event: string;
  'Send on Friday': string;
  'Send before/ after': string;
  'Send time': string;
  'Message Thumbnail': string;
  'To send messages': string;
  'company name for message': string;
  Timezone: string;
  Version: number;
  'Twilio Template SID': string;
}

export const useApiCampaigns = (metaOrgId: string | null) => {
  return useQuery({
    queryKey: ['api-campaigns', metaOrgId, getN8nTestMode()],
    queryFn: async () => {
      const data = await callN8nProxy<ApiCampaign | ApiCampaign[]>(metaOrgId!, '/campaigns/list', getN8nTestMode());
      return Array.isArray(data) ? data : [data];
    },
    enabled: !!metaOrgId,
    staleTime: 30_000,
  });
};
