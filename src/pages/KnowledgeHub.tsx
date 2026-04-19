import { useEffect, useMemo, useRef, useState } from 'react';
import { useArticles, KnowledgeArticle, ArticleType } from '@/hooks/useKnowledge';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { ArticleCard } from '@/components/knowledge/ArticleCard';
import { NewsTicker } from '@/components/knowledge/NewsTicker';
import { ArticleDialog } from '@/components/knowledge/ArticleDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Plus, Search, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Pin } from 'lucide-react';

export default function KnowledgeHub() {
  const { isAdmin } = useAuth();
  const { data: articles, isLoading } = useArticles();
  const { data: departments } = useDepartments();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);

  const tickerArticles = useMemo(
    () =>
      (articles || [])
        .filter((a) => a.is_published)
        .slice(0, 5),
    [articles]
  );

  const filtered = useMemo(() => {
    return (articles || []).filter((a) => {
      if (!a.is_published && !isAdmin) return false;
      if (deptFilter !== 'all' && a.department_id !== deptFilter) return false;
      if (typeFilter !== 'all' && a.article_type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !a.title.toLowerCase().includes(s) &&
          !a.content.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [articles, search, deptFilter, typeFilter, isAdmin]);

  const pinned = filtered.filter((a) => a.is_pinned);
  const regular = filtered.filter((a) => !a.is_pinned);

  // Infinite scroll
  const PAGE_SIZE = 9;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset paging when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, deptFilter, typeFilter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, regular.length));
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [regular.length]);

  const visibleRegular = regular.slice(0, visibleCount);
  const hasMore = visibleCount < regular.length;

  const openEdit = (a: KnowledgeArticle) => {
    setEditing(a);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div dir="rtl" className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            מרכז הידע
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            עדכונים, נהלים ומאמרים של זבילו
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/knowledge/tracking">
                <BarChart2 className="ms-2 h-4 w-4" />
                מעקב קריאה
              </Link>
            </Button>
            <Button onClick={openNew}>
              <Plus className="ms-2 h-4 w-4" />
              מאמר חדש
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפש מאמרים..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="מחלקה" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המחלקות</SelectItem>
            {departments?.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="סוג" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            <SelectItem value="article">מאמר</SelectItem>
            <SelectItem value="update">עדכון</SelectItem>
            <SelectItem value="procedure">נוהל</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Two-column layout: main content + vertical ticker sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          {/* Pinned */}
          {pinned.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Pin className="h-4 w-4 text-orange-500" /> מוצמד
              </h2>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {pinned.map((a) => (
                  <ArticleCard key={a.id} article={a} onEdit={openEdit} />
                ))}
              </div>
            </div>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : regular.length === 0 && pinned.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>אין מאמרים עדיין</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {visibleRegular.map((a) => (
                  <ArticleCard key={a.id} article={a} onEdit={openEdit} />
                ))}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="grid gap-4 grid-cols-1 md:grid-cols-2 pt-2">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-64" />
                  ))}
                </div>
              )}
              {!hasMore && regular.length > PAGE_SIZE && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  הגעת לסוף — {regular.length} מאמרים
                </p>
              )}
            </>
          )}
        </div>

        {/* Vertical ticker sidebar */}
        <div className="hidden lg:block">
          <NewsTicker articles={tickerArticles} />
        </div>
      </div>

      <ArticleDialog open={dialogOpen} onOpenChange={setDialogOpen} article={editing} />
    </div>
  );
}
