import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ArticleType = 'article' | 'update' | 'procedure' | 'briefing';

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  department_id: string | null;
  folder_id: string | null;
  article_type: ArticleType;
  author_id: string;
  is_published: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: { full_name: string; avatar_url: string | null } | null;
  department?: { name: string } | null;
  read_count?: number;
  is_read?: boolean;
}

export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  article: 'מאמר',
  update: 'עדכון',
  procedure: 'נוהל',
  briefing: 'תדריך בוקר',
};

export const ARTICLE_TYPE_COLORS: Record<ArticleType, string> = {
  article: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  update: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  procedure: 'bg-green-100 text-green-700 hover:bg-green-100',
  briefing: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
};

export function useArticles() {
  const { profile, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['knowledge_articles', profile?.id, isAdmin],
    queryFn: async () => {
      const { data: articles, error } = await supabase
        .from('knowledge_articles')
        .select(`
          *,
          author:profiles!knowledge_articles_author_id_fkey(full_name, avatar_url),
          department:departments(name)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: reads } = await supabase
        .from('article_reads')
        .select('article_id, user_id');

      const myProfileId = profile?.id;

      return (articles || []).map((a: any) => {
        const articleReads = (reads || []).filter((r) => r.article_id === a.id);
        return {
          ...a,
          read_count: articleReads.length,
          is_read: myProfileId ? articleReads.some((r) => r.user_id === myProfileId) : false,
        } as KnowledgeArticle;
      });
    },
    enabled: !!profile?.id,
  });
}

export function useArticle(id: string | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['knowledge_article', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select(`
          *,
          author:profiles!knowledge_articles_author_id_fkey(full_name, avatar_url),
          department:departments(name)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;

      const { data: reads } = await supabase
        .from('article_reads')
        .select('user_id, read_at, profiles!article_reads_user_id_fkey(full_name)')
        .eq('article_id', id!);

      return {
        ...data,
        read_count: reads?.length || 0,
        is_read: profile?.id ? reads?.some((r: any) => r.user_id === profile.id) : false,
        readers: reads || [],
      } as KnowledgeArticle & { readers: any[] };
    },
    enabled: !!id,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (articleId: string) => {
      if (!profile?.id) throw new Error('No profile');
      const { error } = await supabase
        .from('article_reads')
        .insert({ article_id: articleId, user_id: profile.id });
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_articles'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge_article'] });
      queryClient.invalidateQueries({ queryKey: ['unread_count'] });
    },
  });
}

export function useUnreadCount() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['unread_count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { data: articles } = await supabase
        .from('knowledge_articles')
        .select('id')
        .eq('is_published', true);
      const { data: reads } = await supabase
        .from('article_reads')
        .select('article_id')
        .eq('user_id', profile.id);
      const readIds = new Set((reads || []).map((r) => r.article_id));
      return (articles || []).filter((a) => !readIds.has(a.id)).length;
    },
    enabled: !!profile?.id,
    refetchInterval: 60000,
  });
}

export function useSaveArticle() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<KnowledgeArticle> & { id?: string }) => {
      if (input.id) {
        const { id, author, department, read_count, is_read, ...updates } = input as any;
        const { error } = await supabase.from('knowledge_articles').update(updates).eq('id', id);
        if (error) throw error;
      } else {
        const { author, department, read_count, is_read, ...rest } = input as any;
        const { error } = await supabase.from('knowledge_articles').insert({
          ...rest,
          author_id: profile?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.id ? 'המאמר עודכן' : 'המאמר פורסם בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['knowledge_articles'] });
      queryClient.invalidateQueries({ queryKey: ['unread_count'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('knowledge_articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('המאמר נמחק');
      queryClient.invalidateQueries({ queryKey: ['knowledge_articles'] });
    },
  });
}

export function useAllArticleReaders() {
  return useQuery({
    queryKey: ['all_article_readers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('article_reads')
        .select('article_id, read_at, profiles!article_reads_user_id_fkey(id, full_name, avatar_url)')
        .order('read_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, Array<{ id: string; full_name: string; avatar_url: string | null; read_at: string }>> = {};
      (data || []).forEach((r: any) => {
        if (!r.profiles) return;
        if (!map[r.article_id]) map[r.article_id] = [];
        map[r.article_id].push({
          id: r.profiles.id,
          full_name: r.profiles.full_name,
          avatar_url: r.profiles.avatar_url,
          read_at: r.read_at,
        });
      });
      return map;
    },
  });
}

export function useArticleReadDetails(articleId: string | undefined) {
  return useQuery({
    queryKey: ['article_read_details', articleId],
    queryFn: async () => {
      const { data: reads } = await supabase
        .from('article_reads')
        .select('user_id, read_at, profiles!article_reads_user_id_fkey(id, full_name, avatar_url)')
        .eq('article_id', articleId!);
      const { data: allEmployees } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url');
      const readIds = new Set((reads || []).map((r: any) => r.user_id));
      const unread = (allEmployees || []).filter((e) => !readIds.has(e.id));
      return { reads: reads || [], unread };
    },
    enabled: !!articleId,
  });
}
