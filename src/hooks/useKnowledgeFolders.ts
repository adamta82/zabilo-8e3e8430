import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KnowledgeFolder {
  id: string;
  name: string;
  department_id: string | null;
  parent_folder_id: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
  article_count?: number;
}

export function useFolders(departmentId?: string) {
  return useQuery({
    queryKey: ['knowledge_folders', departmentId],
    queryFn: async () => {
      let query = supabase.from('knowledge_folders').select('*').order('name');
      if (departmentId) query = query.eq('department_id', departmentId);
      const { data, error } = await query;
      if (error) throw error;

      // Get article counts per folder
      const { data: articles } = await supabase
        .from('knowledge_articles')
        .select('folder_id')
        .eq('is_published', true);

      const counts: Record<string, number> = {};
      (articles || []).forEach((a) => {
        if (a.folder_id) counts[a.folder_id] = (counts[a.folder_id] || 0) + 1;
      });

      return (data || []).map((f) => ({
        ...f,
        article_count: counts[f.id] || 0,
      })) as KnowledgeFolder[];
    },
  });
}

export function useSaveFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<KnowledgeFolder> & { id?: string }) => {
      const { article_count, ...rest } = input as any;
      if (input.id) {
        const { id, ...updates } = rest;
        const { error } = await supabase.from('knowledge_folders').update(updates).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('knowledge_folders').insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.id ? 'התיקייה עודכנה' : 'התיקייה נוצרה');
      qc.invalidateQueries({ queryKey: ['knowledge_folders'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('knowledge_folders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('התיקייה נמחקה');
      qc.invalidateQueries({ queryKey: ['knowledge_folders'] });
      qc.invalidateQueries({ queryKey: ['knowledge_articles'] });
    },
  });
}

// Article counts per department for the hub page
export function useDepartmentArticleCounts() {
  return useQuery({
    queryKey: ['department_article_counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select('department_id')
        .eq('is_published', true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((a) => {
        if (a.department_id) counts[a.department_id] = (counts[a.department_id] || 0) + 1;
      });
      return counts;
    },
  });
}
