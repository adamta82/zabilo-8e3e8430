import { Megaphone, Pin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KnowledgeArticle, ARTICLE_TYPE_LABELS, ARTICLE_TYPE_COLORS } from '@/hooks/useKnowledge';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface Props {
  articles: KnowledgeArticle[];
}

export function NewsTicker({ articles }: Props) {
  if (articles.length === 0) return null;

  // Duplicate for seamless vertical loop
  const items = [...articles, ...articles];

  return (
    <aside className="rounded-lg border bg-card overflow-hidden sticky top-4">
      <div className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground">
        <Megaphone className="h-4 w-4" />
        <h3 className="text-sm font-semibold">עדכונים אחרונים</h3>
      </div>

      <div className="relative h-[480px] overflow-hidden group">
        <div className="ticker-vertical flex flex-col group-hover:[animation-play-state:paused]">
          {items.map((a, idx) => (
            <Link
              key={`${a.id}-${idx}`}
              to={`/knowledge/${a.id}`}
              className="block px-4 py-3 border-b hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <Badge
                  className={ARTICLE_TYPE_COLORS[a.article_type]}
                  variant="secondary"
                >
                  {ARTICLE_TYPE_LABELS[a.article_type]}
                </Badge>
                {a.is_pinned && <Pin className="h-3 w-3 text-orange-500 fill-orange-500" />}
              </div>
              <h4 className="text-sm font-medium line-clamp-2 mb-1">{a.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                {a.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: he })}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
