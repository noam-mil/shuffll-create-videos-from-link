import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TemplateScene } from '@/types/template';

export function useTemplateScenes(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-scenes', templateId],
    queryFn: async () => {
      if (!templateId) throw new Error('No template ID');
      const { data, error } = await supabase
        .from('template_scenes')
        .select('*')
        .eq('template_id', templateId)
        .order('scene_order', { ascending: true });

      if (error) throw error;
      return data as TemplateScene[];
    },
    enabled: !!templateId,
  });
}

export function useCreateScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scene: Omit<TemplateScene, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('template_scenes')
        .insert(scene)
        .select()
        .single();

      if (error) throw error;
      return data as TemplateScene;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-scenes', data.template_id] });
    },
  });
}

export function useUpdateScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TemplateScene> & { id: string }) => {
      const { data, error } = await supabase
        .from('template_scenes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TemplateScene;
    },
    onSuccess: (data) => {
      // Optimistically update cache instead of refetching (prevents input lag)
      queryClient.setQueryData<TemplateScene[]>(
        ['template-scenes', data.template_id],
        (old) => old?.map(s => (s.id === data.id ? data : s))
      );
    },
  });
}

export function useDeleteScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await supabase
        .from('template_scenes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['template-scenes', templateId] });
    },
  });
}

export function useReorderScenes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scenes: { id: string; scene_order: number; template_id: string }[]) => {
      // Update each scene's order in parallel
      const updates = scenes.map(({ id, scene_order }) =>
        supabase
          .from('template_scenes')
          .update({ scene_order })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;

      return scenes[0]?.template_id;
    },
    onSuccess: (templateId) => {
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: ['template-scenes', templateId] });
      }
    },
  });
}
