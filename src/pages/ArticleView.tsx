import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useArticle,
  useArticles,
  useMarkAsRead,
  ARTICLE_TYPE_COLORS,
  ARTICLE_TYPE_LABELS,
  ArticleType,
} from '@/hooks/useKnowledge';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Check, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

export default function ArticleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: article, isLoading } = useArticle(id);
  const { data: allArticles } = useArticles();
  const markAsRead = useMarkAsRead();
  const [readersOpen, setReadersOpen] = useState(false);

  if (isLoading || !article) {
    return (
      <div className="p-6 max-w-4xl mx-auto" dir="rtl">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const published = (allArticles || []).filter((a) => a.is_published);
  const idx = published.findIndex((a) => a.id === article.id);
  const prev = idx > 0 ? published[idx - 1] : null;
  const next = idx >= 0 && idx < published.length - 1 ? published[idx + 1] : null;

  // Estimate total employees from read details (admin sees real numbers)
  const readPercentage = article.read_count
    ? Math.min(100, Math.round((article.read_count / Math.max(1, (article as any).readers?.length || article.read_count)) * 100))
    : 0;

  const initials = article.author?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) || 'U';

  return (
    <div dir="rtl" className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">מרכז הידע</Link></BreadcrumbLink>
          </BreadcrumbItem>
          {article.department?.name && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span>{article.department.name}</span>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{article.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">{article.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge className={ARTICLE_TYPE_COLORS[article.article_type as ArticleType]} variant="secondary">
            {ARTICLE_TYPE_LABELS[article.article_type as ArticleType]}
          </Badge>
          {article.department?.name && <Badge variant="outline">{article.department.name}</Badge>}
          <Badge variant="outline">{article.topic}</Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Avatar className="h-8 w-8">
            <AvatarImage src={article.author?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{article.author?.full_name}</span>
          <span>·</span>
          <span>{format(new Date(article.created_at), 'd בMMMM yyyy', { locale: he })}</span>
        </div>
      </header>

      {/* Content */}
      <div className="text-base leading-relaxed whitespace-pre-wrap rtl:text-right">
        {article.content}
      </div>

      {/* Read progress */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            נקרא על ידי {article.read_count || 0} עובדים
          </span>
        </div>
        <Progress value={Math.min(100, readPercentage)} />
      </div>

      {/* Mark as read */}
      <div className="flex justify-center py-2">
        <Button
          size="lg"
          disabled={article.is_read || markAsRead.isPending}
          onClick={() => markAsRead.mutate(article.id)}
          className={article.is_read ? 'bg-green-500 hover:bg-green-500' : ''}
        >
          <Check className="ms-2 h-5 w-5" />
          {article.is_read ? 'סומן כנקרא' : 'סמן כנקרא'}
        </Button>
      </div>

      {/* Admin: who read */}
      {isAdmin && (article as any).readers?.length > 0 && (
        <Collapsible open={readersOpen} onOpenChange={setReadersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              {readersOpen ? 'הסתר' : 'הצג'} מי קרא ({(article as any).readers.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {(article as any).readers.map((r: any) => (
              <div key={r.user_id} className="flex justify-between items-center text-sm border-b py-2">
                <span>{r.profiles?.full_name}</span>
                <span className="text-muted-foreground text-xs">
                  {format(new Date(r.read_at), 'd בMMMM, HH:mm', { locale: he })}
                </span>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-2 pt-4 border-t">
        <Button
          variant="ghost"
          disabled={!prev}
          onClick={() => prev && navigate(`/knowledge/${prev.id}`)}
        >
          <ChevronRight className="ms-1 h-4 w-4" />
          {prev ? prev.title.slice(0, 30) : 'אין מאמר קודם'}
        </Button>
        <Button
          variant="ghost"
          disabled={!next}
          onClick={() => next && navigate(`/knowledge/${next.id}`)}
        >
          {next ? next.title.slice(0, 30) : 'אין מאמר הבא'}
          <ChevronLeft className="me-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
