import { useState } from 'react';
import { useComments, useCreateComment } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import { CommentItem } from './CommentItem';

interface Props {
  articleId: string;
}

export function CommentsSection({ articleId }: Props) {
  const { user, profile } = useAuth();
  const { data: comments, isLoading } = useComments(articleId);
  const createComment = useCreateComment();
  const [content, setContent] = useState('');

  const totalCount = (comments || []).reduce((sum, c) => {
    const countReplies = (cs: typeof comments): number =>
      (cs || []).reduce((s, x) => s + 1 + countReplies(x.replies), 0);
    return sum + 1 + countReplies(c.replies);
  }, 0);

  const initials = profile?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || '?';

  const handleSubmit = () => {
    if (!content.trim()) return;
    createComment.mutate(
      { articleId, content: content.trim() },
      { onSuccess: () => setContent('') }
    );
  };

  return (
    <section className="space-y-4 pt-6 border-t">
      <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        תגובות {totalCount > 0 && <span className="text-muted-foreground">({totalCount})</span>}
      </h2>

      {user && (
        <div className="flex gap-2 sm:gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="כתוב תגובה..."
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || createComment.isPending}
                size="sm"
              >
                פרסם תגובה
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isLoading && (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        )}
        {!isLoading && comments?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            אין עדיין תגובות. היה הראשון להגיב!
          </p>
        )}
        {comments?.map((c) => (
          <CommentItem key={c.id} comment={c} articleId={articleId} />
        ))}
      </div>
    </section>
  );
}
