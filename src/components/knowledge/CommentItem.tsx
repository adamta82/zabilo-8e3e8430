import { useState } from 'react';
import { ArticleComment, useToggleLike, useUpdateComment, useDeleteComment, useCreateComment } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Pencil, Trash2, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  comment: ArticleComment;
  articleId: string;
  depth?: number;
}

export function CommentItem({ comment, articleId, depth = 0 }: Props) {
  const { user, isAdmin } = useAuth();
  const toggleLike = useToggleLike();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const createComment = useCreateComment();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const isOwn = user?.id === comment.user_id;
  const canDelete = isOwn || isAdmin;
  const initials = comment.author?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || '?';

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    updateComment.mutate(
      { id: comment.id, content: editContent.trim(), articleId },
      { onSuccess: () => setEditing(false) }
    );
  };

  const handleReply = () => {
    if (!replyContent.trim()) return;
    createComment.mutate(
      { articleId, content: replyContent.trim(), parentId: comment.id },
      {
        onSuccess: () => {
          setReplyContent('');
          setReplying(false);
        },
      }
    );
  };

  return (
    <div className={cn('space-y-3', depth > 0 && 'border-r-2 border-muted pr-3 sm:pr-4 me-1')}>
      <div className="flex gap-2 sm:gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.author?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted/50 rounded-lg px-3 py-2">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <span className="font-medium text-sm">{comment.author?.full_name || 'משתמש'}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: he })}
                {comment.is_edited && <span className="ms-1">(נערך)</span>}
              </span>
            </div>
            {editing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={updateComment.isPending}>
                    <Check className="h-3 w-3 ms-1" />
                    שמור
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditContent(comment.content); }}>
                    <X className="h-3 w-3 ms-1" />
                    בטל
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
            )}
          </div>

          {!editing && (
            <div className="flex items-center gap-1 mt-1 px-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-7 px-2 text-xs gap-1', comment.is_liked && 'text-red-500')}
                onClick={() => toggleLike.mutate({ commentId: comment.id, isLiked: comment.is_liked, articleId })}
              >
                <Heart className={cn('h-3.5 w-3.5', comment.is_liked && 'fill-current')} />
                {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
              </Button>
              {depth < 3 && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setReplying(!replying)}>
                  <MessageCircle className="h-3.5 w-3.5" />
                  הגב
                </Button>
              )}
              {isOwn && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  ערוך
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm('למחוק את התגובה?')) {
                      deleteComment.mutate({ id: comment.id, articleId });
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  מחק
                </Button>
              )}
            </div>
          )}

          {replying && (
            <div className="mt-2 space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="כתוב תגובה..."
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReply} disabled={createComment.isPending || !replyContent.trim()}>
                  שלח
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setReplying(false); setReplyContent(''); }}>
                  בטל
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 me-8 sm:me-10">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} articleId={articleId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
