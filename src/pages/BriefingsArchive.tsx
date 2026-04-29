import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sunrise, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArticleCard } from '@/components/knowledge/ArticleCard';
import { useArticles } from '@/hooks/useKnowledge';
import { useAuth } from '@/contexts/AuthContext';

export default function BriefingsArchive() {
  const { data: articles } = useArticles();
  const { isAdmin } = useAuth();

  const briefings = useMemo(
    () =>
      (articles || [])
        .filter((a) => a.article_type === 'briefing' && (a.is_published || isAdmin))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [articles, isAdmin]
  );

  return (
    <div dir="rtl" className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
            <Sunrise className="h-5 w-5 sm:h-7 sm:w-7 text-amber-500" />
            ארכיון תדריכי בוקר
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            כל תדריכי הבוקר מהעבר
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowRight className="ms-1 h-4 w-4" />
            חזרה למרכז הידע
          </Link>
        </Button>
      </div>

      {briefings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          אין תדריכים בארכיון עדיין
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {briefings.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
