import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ArticleComment {
  id: string;
  article_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author?: { full_name: string; avatar_url: string | null } | null;
  likes_count: number;
  is_liked: boolean;
  replies?: ArticleComment[];
}

export function useComments(articleId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['article_comments', articleId],
    enabled: !!articleId,
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('article_comments')
        .select('*')
        .eq('article_id', articleId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!comments?.length) return [] as ArticleComment[];

      const userIds = [...new Set(comments.map((c) => c.user_id))];
      const ids = comments.map((c) => c.id);

      const [{ data: authors }, { data: likes }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
        supabase.from('comment_likes').select('comment_id, user_id').in('comment_id', ids),
      ]);

      const authorMap = new Map((authors || []).map((a) => [a.user_id, a]));
      const likeCounts = new Map<string, number>();
      const likedByMe = new Set<string>();
      (likes || []).forEach((l) => {
        likeCounts.set(l.comment_id, (likeCounts.get(l.comment_id) || 0) + 1);
        if (user && l.user_id === user.id) likedByMe.add(l.comment_id);
      });

      const enriched: ArticleComment[] = comments.map((c) => ({
        ...c,
        author: authorMap.get(c.user_id) || null,
        likes_count: likeCounts.get(c.id) || 0,
        is_liked: likedByMe.has(c.id),
      }));

      // Build tree
      const map = new Map<string, ArticleComment>();
      enriched.forEach((c) => map.set(c.id, { ...c, replies: [] }));
      const roots: ArticleComment[] = [];
      map.forEach((c) => {
        if (c.parent_id && map.has(c.parent_id)) {
          map.get(c.parent_id)!.replies!.push(c);
        } else {
          roots.push(c);
        }
      });
      return roots;
    },
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      articleId,
      content,
      parentId,
    }: {
      articleId: string;
      content: string;
      parentId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('article_comments').insert({
        article_id: articleId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['article_comments', vars.articleId] });
    },
    onError: (e: any) => toast.error(e.message || 'שגיאה בהוספת תגובה'),
  });
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string; articleId: string }) => {
      const { error } = await supabase
        .from('article_comments')
        .update({ content, is_edited: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['article_comments', vars.articleId] });
    },
    onError: (e: any) => toast.error(e.message || 'שגיאה בעדכון'),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; articleId: string }) => {
      const { error } = await supabase.from('article_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['article_comments', vars.articleId] });
      toast.success('התגובה נמחקה');
    },
    onError: (e: any) => toast.error(e.message || 'שגיאה במחיקה'),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      commentId,
      isLiked,
    }: {
      commentId: string;
      isLiked: boolean;
      articleId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      if (isLiked) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['article_comments', vars.articleId] });
    },
  });
}
