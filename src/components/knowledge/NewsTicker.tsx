import { Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KnowledgeArticle } from '@/hooks/useKnowledge';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Props {
  articles: KnowledgeArticle[];
}

export function NewsTicker({ articles }: Props) {
  if (articles.length === 0) return null;

  // Duplicate for seamless loop
  const items = [...articles, ...articles];

  return (
    <div className="relative overflow-hidden rounded-lg bg-[#1e3a5f] text-white py-2.5 group">
      <div className="ticker-track flex gap-12 whitespace-nowrap group-hover:[animation-play-state:paused]">
        {items.map((a, idx) => (
          <Link
            key={`${a.id}-${idx}`}
            to={`/knowledge/${a.id}`}
            className="flex items-center gap-2 text-sm hover:text-orange-300 transition-colors"
          >
            <Megaphone className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">{a.title}</span>
            <span className="text-white/60 text-xs">
              · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: he })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
