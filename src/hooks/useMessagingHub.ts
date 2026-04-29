import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'n8n-test-mode';

export const getN8nTestMode = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const setN8nTestMode = (enabled: boolean) => {
  localStorage.setItem(STORAGE_KEY, String(enabled));
};

export interface Company {
  sent_for_company: string;
  last_sent: string;
  total_messages?: number;
}

export interface Message {
  id: string;
  recipient: string;
  message: string;
  status: string;
  sentAt: string;
}

export interface DailyMessage {
  sent_for_company: string;
  status: string;
  count: string;
}

export interface DayStatusEntry {
  to_number: string;
  first_name: string;
  html_link: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

export const callN8nProxy = async <T>(
  metaOrgId: string,
  path: string,
  testMode: boolean,
  method: 'GET' | 'POST' = 'GET',
  payload?: Record<string, unknown>
): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('n8n-proxy', {
    body: { metaOrgId, path, testMode, method, payload },
  });

  if (error) {
    throw new Error(error.message || 'Failed to fetch from n8n');
  }

  return data as T;
};

export const useCompanies = (metaOrgId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['messaging-companies', metaOrgId, getN8nTestMode()],
    queryFn: () => callN8nProxy<Company[]>(metaOrgId!, '/messages/companies', getN8nTestMode()),
    enabled: !!metaOrgId && enabled,
    staleTime: 30 * 1000,
    refetchInterval: enabled ? 30 * 1000 : false,
  });
};

export const useCompanyMessages = (
  metaOrgId: string | null,
  companyName: string | null,
  dateRange: DateRange,
  enabled = true
) => {
  return useQuery({
    queryKey: ['messaging-messages', metaOrgId, companyName, dateRange, getN8nTestMode()],
    queryFn: () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const path = `/messages/company/${encodeURIComponent(companyName!)}?${params}`;
      return callN8nProxy<Message[]>(metaOrgId!, path, getN8nTestMode());
    },
    enabled: !!metaOrgId && !!companyName && enabled,
    staleTime: 30 * 1000,
    refetchInterval: enabled ? 30 * 1000 : false,
  });
};

export const useDailyMessages = (
  metaOrgId: string | null,
  date: string // YYYY-MM-DD
) => {
  return useQuery({
    queryKey: ['messaging-daily', metaOrgId, date, getN8nTestMode()],
    queryFn: () =>
      callN8nProxy<DailyMessage[]>(
        metaOrgId!,
        `/messages/day?date=${date}`,
        getN8nTestMode()
      ),
    enabled: !!metaOrgId && !!date,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
};
