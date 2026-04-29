import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DbTemplate } from '@/types/template';

export function useTemplates(metaOrgId?: string | null) {
  return useQuery({
    queryKey: ['templates', metaOrgId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (metaOrgId) {
        // Show org-specific + system-wide templates
        query = query.or(`meta_organization_id.eq.${metaOrgId},meta_organization_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DbTemplate[];
    },
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      if (!id) throw new Error('No template ID');
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as DbTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<DbTemplate, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data as DbTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DbTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', data.id] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
