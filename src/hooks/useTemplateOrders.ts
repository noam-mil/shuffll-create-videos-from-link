import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TemplateOrder } from '@/types/template';

export function useTemplateOrders(metaOrgId?: string | null) {
  return useQuery({
    queryKey: ['template-orders', metaOrgId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('template_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (metaOrgId) {
        query = query.eq('meta_organization_id', metaOrgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TemplateOrder[];
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: Omit<TemplateOrder, 'id' | 'created_by' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('template_orders')
        .insert(order)
        .select()
        .single();

      if (error) throw error;
      return data as TemplateOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-orders'] });
    },
  });
}
