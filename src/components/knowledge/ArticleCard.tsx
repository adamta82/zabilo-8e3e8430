import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Pin, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ARTICLE_TYPE_COLORS,
  ARTICLE_TYPE_LABELS,
  KnowledgeArticle,
  useDeleteArticle,
} from '@/hooks/useKnowledge';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  article: KnowledgeArticle;
  onEdit?: (article: KnowledgeArticle) => void;
  fullWidth?: boolean;
}

export function ArticleCard({ article, onEdit, fullWidth }: Props) {
  const { isAdmin } = useAuth();
  const deleteArticle = useDeleteArticle();
  const navigate = useNavigate();
  const isBriefing = article.article_type === 'briefing';

  const initials = article.author?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) || 'U';

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on an interactive element (admin menu)
    if ((e.target as HTMLElement).closest('[data-no-nav]')) return;
    navigate(`/knowledge/${article.id}`);
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        'relative flex flex-col h-full transition-all hover:shadow-md cursor-pointer',
        article.is_pinned && !isBriefing && 'border-orange-300 border-2',
        isBriefing && 'border-amber-400 border-2 bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-950/20',
        fullWidth && 'w-full'
      )}
    >
      {!article.is_read && (
        <span className="absolute top-3 left-3 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
      )}
      {article.is_pinned && (
        <div className="absolute top-3 right-3 text-orange-500">
          <Pin className="h-4 w-4 fill-orange-500" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={ARTICLE_TYPE_COLORS[article.article_type]} variant="secondary">
              {ARTICLE_TYPE_LABELS[article.article_type]}
            </Badge>
            {article.department?.name && (
              <Badge variant="outline">{article.department.name}</Badge>
            )}
          </div>
          {isAdmin && (
            <div data-no-nav onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(article)}>
                    <Pencil className="ms-2 h-4 w-4" />
                    ערוך
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      if (confirm('למחוק את המאמר?')) deleteArticle.mutate(article.id);
                    }}
                  >
                    <Trash2 className="ms-2 h-4 w-4" />
                    מחק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <h3 className="font-bold text-lg line-clamp-2">{article.title}</h3>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {article.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
        </p>

        <div className="mt-auto">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarImage src={article.author?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate">{article.author?.full_name}</span>
            <span className="shrink-0">·</span>
            <span className="truncate shrink-0">
              {formatDistanceToNow(new Date(article.created_at), { addSuffix: true, locale: he })}
            </span>
            {isAdmin && (
              <>
                <span className="shrink-0">·</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Eye className="h-3.5 w-3.5" />
                  {article.read_count || 0}
                </span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
