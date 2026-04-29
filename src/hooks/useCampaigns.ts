import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Campaign, CampaignEntry, CampaignClientStatus, CampaignSystemStatus } from '@/types/campaign';
import type { Json } from '@/integrations/supabase/types';

interface UseCampaignsOptions {
  organizationId: string | undefined;
}

export const useCampaigns = ({ organizationId }: UseCampaignsOptions) => {
  return useQuery({
    queryKey: ['campaigns', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!organizationId,
  });
};

interface UseCampaignOptions {
  campaignId: string | undefined;
}

export const useCampaign = ({ campaignId }: UseCampaignOptions) => {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    enabled: !!campaignId,
  });
};

export const useCampaignEntries = ({ campaignId }: UseCampaignOptions) => {
  return useQuery({
    queryKey: ['campaign-entries', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('campaign_entries')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CampaignEntry[];
    },
    enabled: !!campaignId,
  });
};

interface CreateCampaignInput {
  organization_id: string;
  name: string;
  template_id?: string;
}

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.organization_id] });
    },
  });
};

interface UpdateCampaignInput {
  id: string;
  name?: string;
  client_status?: CampaignClientStatus;
  system_status?: CampaignSystemStatus | null;
  template_id?: string | null;
}

export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCampaignInput) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['campaign', data.id] });
    },
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, organizationId };
    },
    onSuccess: ({ organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', organizationId] });
    },
  });
};

interface AddCampaignEntriesInput {
  campaignId: string;
  entries: Json[];
}

export const useAddCampaignEntries = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, entries }: AddCampaignEntriesInput) => {
      const inserts = entries.map(data => ({
        campaign_id: campaignId,
        data,
      }));

      const { data, error } = await supabase
        .from('campaign_entries')
        .insert(inserts)
        .select();

      if (error) throw error;
      return data as CampaignEntry[];
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-entries', campaignId] });
    },
  });
};
