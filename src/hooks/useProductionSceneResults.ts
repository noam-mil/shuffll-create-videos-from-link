import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProductionSceneResult } from '@/types/template';

export function useProductionSceneResults(productionId: string | undefined) {
  return useQuery({
    queryKey: ['production-scene-results', productionId],
    queryFn: async () => {
      if (!productionId) throw new Error('No production ID');
      const { data, error } = await supabase
        .from('production_scene_results')
        .select('*')
        .eq('production_id', productionId)
        .order('scene_order', { ascending: true });

      if (error) throw error;
      return data as ProductionSceneResult[];
    },
    enabled: !!productionId,
  });
}

export function useUpdateSceneResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductionSceneResult> & { id: string }) => {
      const { data, error } = await supabase
        .from('production_scene_results')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProductionSceneResult;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<ProductionSceneResult[]>(
        ['production-scene-results', data.production_id],
        (old) => old?.map(r => (r.id === data.id ? data : r))
      );
    },
  });
}
