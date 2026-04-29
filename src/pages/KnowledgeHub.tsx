import { useMemo, useState } from 'react';
import { useArticles, KnowledgeArticle } from '@/hooks/useKnowledge';
import { useDepartments } from '@/hooks/useDepartments';
import { useDepartmentArticleCounts } from '@/hooks/useKnowledgeFolders';
import { useAuth } from '@/contexts/AuthContext';
import { ArticleCard } from '@/components/knowledge/ArticleCard';
import { NewsTicker } from '@/components/knowledge/NewsTicker';
import { ArticleDialog } from '@/components/knowledge/ArticleDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { BookOpen, Plus, Search, BarChart2, Pin, Building2, ChevronLeft, FolderOpen, Sunrise } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CreateBriefingDialog } from '@/components/briefings/CreateBriefingDialog';

export default function KnowledgeHub() {
  const { isAdmin, canManageShifts } = useAuth();
  const { data: articles, isLoading } = useArticles();
  const { data: departments } = useDepartments();
  const { data: deptCounts } = useDepartmentArticleCounts();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);

  const tickerArticles = useMemo(
    () => (articles || []).filter((a) => a.is_published && a.article_type !== 'briefing').slice(0, 5),
    [articles]
  );

  const latestBriefing = useMemo(
    () => (articles || [])
      .filter((a) => a.article_type === 'briefing' && (a.is_published || isAdmin))[0],
    [articles, isAdmin]
  );

  const pinned = useMemo(
    () => (articles || []).filter((a) => a.is_pinned && a.article_type !== 'briefing' && (a.is_published || isAdmin)),
    [articles, isAdmin]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const s = search.toLowerCase();
    return (articles || []).filter((a) => {
      if (!a.is_published && !isAdmin) return false;
      return a.title.toLowerCase().includes(s) || a.content.toLowerCase().includes(s);
    });
  }, [articles, search, isAdmin]);

  const openEdit = (a: KnowledgeArticle) => { setEditing(a); setDialogOpen(true); };
  const openNew = () => { setEditing(null); setDialogOpen(true); };

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
        <div className="flex gap-2 flex-wrap">
          {canManageShifts && <CreateBriefingDialog />}
          {isAdmin && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חפש בכל המאמרים..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          {searchResults ? (
            // Search mode
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                תוצאות חיפוש ({searchResults.length})
              </h2>
              {searchResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>לא נמצאו מאמרים</p>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((a) => (
                    <ArticleCard key={a.id} article={a} onEdit={openEdit} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Latest briefing - full width, distinctive amber */}
              {latestBriefing && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Sunrise className="h-4 w-4 text-amber-500" /> תדריך בוקר אחרון
                    </h2>
                    <Link
                      to="/knowledge/briefings"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      ארכיון תדריכים ←
                    </Link>
                  </div>
                  <ArticleCard article={latestBriefing} onEdit={openEdit} fullWidth />
                </div>
              )}

              {/* Pinned */}
              {pinned.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Pin className="h-4 w-4 text-orange-500" /> מוצמד
                  </h2>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {pinned.map((a) => (
                      <ArticleCard key={a.id} article={a} onEdit={openEdit} />
                    ))}
                  </div>
                </div>
              )}

              {/* Departments grid */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> מחלקות
                </h2>
                {isLoading || !departments ? (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {departments.map((d) => {
                      const count = deptCounts?.[d.id] || 0;
                      return (
                        <Link key={d.id} to={`/knowledge/department/${d.id}`}>
                          <Card className="p-5 h-full hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="bg-primary/10 text-primary rounded-lg p-2.5 shrink-0">
                                  <FolderOpen className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-semibold truncate">{d.name}</h3>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {count} מאמרים
                                  </p>
                                </div>
                              </div>
                              <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-all" />
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
