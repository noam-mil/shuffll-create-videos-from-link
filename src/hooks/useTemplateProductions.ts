import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TemplateProduction } from '@/types/template';

export function useTemplateProductions(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-productions', templateId],
    queryFn: async () => {
      if (!templateId) throw new Error('No template ID');
      const { data, error } = await supabase
        .from('template_productions')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TemplateProduction[];
    },
    enabled: !!templateId,
  });
}

export function useProduction(productionId: string | undefined) {
  return useQuery({
    queryKey: ['production', productionId],
    queryFn: async () => {
      if (!productionId) throw new Error('No production ID');
      const { data, error } = await supabase
        .from('template_productions')
        .select('*')
        .eq('id', productionId)
        .single();

      if (error) throw error;
      return data as TemplateProduction;
    },
    enabled: !!productionId,
  });
}

export function useCreateProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      template_id: string;
      meta_organization_id?: string | null;
      organization_id?: string | null;
      name?: string;
    }) => {
      // 1. Create the production
      const { data: production, error } = await supabase
        .from('template_productions')
        .insert({
          template_id: params.template_id,
          meta_organization_id: params.meta_organization_id ?? null,
          organization_id: params.organization_id ?? null,
          name: params.name ?? 'Untitled Production',
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Fetch base scenes for this template
      const { data: baseScenes } = await supabase
        .from('template_scenes')
        .select('*')
        .eq('template_id', params.template_id)
        .order('scene_order');

      // 3. Create scene results for each base scene
      if (baseScenes && baseScenes.length > 0) {
        const sceneResults = baseScenes.map(scene => ({
          production_id: production.id,
          template_scene_id: scene.id,
          scene_order: scene.scene_order,
          voice_script: scene.voice_script ?? null,
        }));

        const { error: insertError } = await supabase
          .from('production_scene_results')
          .insert(sceneResults);

        if (insertError) {
          // Cleanup: delete the production if scene results fail
          await supabase.from('template_productions').delete().eq('id', production.id);
          throw insertError;
        }
      }

      return production as TemplateProduction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-productions', data.template_id] });
    },
  });
}

export function useUpdateProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TemplateProduction> & { id: string }) => {
      const { data, error } = await supabase
        .from('template_productions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TemplateProduction;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<TemplateProduction>(
        ['production', data.id],
        data
      );
    },
  });
}

export function useDeleteProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await supabase
        .from('template_productions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['template-productions', templateId] });
      queryClient.invalidateQueries({ queryKey: ['all-productions'] });
    },
  });
}

export interface ProductionWithRelations extends TemplateProduction {
  template?: { id: string; name: string };
  meta_org?: { id: string; name: string };
}

export function useAllProductions() {
  return useQuery({
    queryKey: ['all-productions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_productions')
        .select('*, templates:template_id(id, name), meta_organizations:meta_organization_id(id, name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        template: row.templates ?? undefined,
        meta_org: row.meta_organizations ?? undefined,
      })) as ProductionWithRelations[];
    },
  });
}
