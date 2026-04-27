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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BookOpen, Plus, Search, BarChart2, Pin, Newspaper, ClipboardList, FileText, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function KnowledgeHub() {
  const { isAdmin } = useAuth();
  const { data: articles, isLoading } = useArticles();
  const { data: departments } = useDepartments();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [typeTab, setTypeTab] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);

  const tickerArticles = useMemo(
    () =>
      (articles || [])
        .filter((a) => a.is_published)
        .slice(0, 5),
    [articles]
  );

  // Base filter (search + department + visibility) — type filter applied per tab
  const baseFiltered = useMemo(() => {
    return (articles || []).filter((a) => {
      if (!a.is_published && !isAdmin) return false;
      if (deptFilter !== 'all' && a.department_id !== deptFilter) return false;
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
  }, [articles, search, deptFilter, isAdmin]);

  const counts = useMemo(() => ({
    all: baseFiltered.length,
    update: baseFiltered.filter((a) => a.article_type === 'update').length,
    procedure: baseFiltered.filter((a) => a.article_type === 'procedure').length,
    article: baseFiltered.filter((a) => a.article_type === 'article').length,
  }), [baseFiltered]);

  // Pinned (across all types after base filter)
  const pinned = baseFiltered.filter((a) => a.is_pinned);

  // Articles for active tab (excluding pinned — they show in their own section)
  const tabFiltered = useMemo(() => {
    const list = baseFiltered.filter((a) => !a.is_pinned);
    if (typeTab === 'all') return list;
    return list.filter((a) => a.article_type === typeTab);
  }, [baseFiltered, typeTab]);

  // Infinite scroll
  const PAGE_SIZE = 9;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset paging when filters/tab change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, deptFilter, typeTab]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, tabFiltered.length));
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tabFiltered.length]);

  const visibleRegular = tabFiltered.slice(0, visibleCount);
  const hasMore = visibleCount < tabFiltered.length;

  const openEdit = (a: KnowledgeArticle) => {
    setEditing(a);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div dir="rtl" className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            מרכז הידע
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            עדכונים, נהלים ומאמרים של זבילו
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/knowledge/tracking">
                <BarChart2 className="ms-1 sm:ms-2 h-4 w-4" />
                <span className="hidden sm:inline">מעקב קריאה</span>
              </Link>
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="ms-1 sm:ms-2 h-4 w-4" />
              <span className="hidden sm:inline">מאמר חדש</span>
              <span className="sm:hidden">חדש</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפש מאמרים..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[130px] sm:w-[180px]"><SelectValue placeholder="מחלקה" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המחלקות</SelectItem>
            {departments?.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type tabs */}
      <Tabs value={typeTab} onValueChange={setTypeTab} className="w-full flex justify-start">
        <TabsList className="h-auto flex flex-wrap gap-1 bg-muted/60 p-1 w-fit">
          <TabsTrigger value="all" className="gap-1.5 data-[state=active]:bg-background">
            <LayoutGrid className="h-3.5 w-3.5" />
            הכל
            <span className="text-xs opacity-70">({counts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="update" className="gap-1.5 data-[state=active]:bg-background">
            <Newspaper className="h-3.5 w-3.5" />
            עדכונים
            <span className="text-xs opacity-70">({counts.update})</span>
          </TabsTrigger>
          <TabsTrigger value="procedure" className="gap-1.5 data-[state=active]:bg-background">
            <ClipboardList className="h-3.5 w-3.5" />
            נהלים
            <span className="text-xs opacity-70">({counts.procedure})</span>
          </TabsTrigger>
          <TabsTrigger value="article" className="gap-1.5 data-[state=active]:bg-background">
            <FileText className="h-3.5 w-3.5" />
            מאמרים
            <span className="text-xs opacity-70">({counts.article})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
          ) : tabFiltered.length === 0 && pinned.length === 0 ? (
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
              {!hasMore && tabFiltered.length > PAGE_SIZE && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  הגעת לסוף — {tabFiltered.length} מאמרים
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
