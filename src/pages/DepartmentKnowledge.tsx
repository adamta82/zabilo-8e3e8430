import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useArticles, KnowledgeArticle } from '@/hooks/useKnowledge';
import { useDepartments } from '@/hooks/useDepartments';
import { useFolders, KnowledgeFolder } from '@/hooks/useKnowledgeFolders';
import { useAuth } from '@/contexts/AuthContext';
import { ArticleCard } from '@/components/knowledge/ArticleCard';
import { ArticleDialog } from '@/components/knowledge/ArticleDialog';
import { FolderDialog } from '@/components/knowledge/FolderDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Folder, FolderPlus, Plus, Search, Building2, FileText, Pencil } from 'lucide-react';

export default function DepartmentKnowledge() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: departments } = useDepartments();
  const { data: articles, isLoading } = useArticles();
  const { data: folders } = useFolders(departmentId);

  const [search, setSearch] = useState('');
  const [articleDialog, setArticleDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [folderDialog, setFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<KnowledgeFolder | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const department = departments?.find((d) => d.id === departmentId);

  const departmentArticles = useMemo(() => {
    return (articles || []).filter((a) => {
      if (a.department_id !== departmentId) return false;
      if (!a.is_published && !isAdmin) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!a.title.toLowerCase().includes(s) && !a.content.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [articles, departmentId, isAdmin, search]);

  const visibleArticles = useMemo(() => {
    if (activeFolderId === null) return departmentArticles.filter((a) => !a.folder_id);
    return departmentArticles.filter((a) => a.folder_id === activeFolderId);
  }, [departmentArticles, activeFolderId]);

  const folderCounts = useMemo(() => {
    const map: Record<string, number> = {};
    departmentArticles.forEach((a) => {
      if (a.folder_id) map[a.folder_id] = (map[a.folder_id] || 0) + 1;
    });
    return map;
  }, [departmentArticles]);

  const looseCount = departmentArticles.filter((a) => !a.folder_id).length;

  if (!department) {
    return (
      <div dir="rtl" className="text-center py-16 text-muted-foreground">
        <p>מחלקה לא נמצאה</p>
        <Button variant="link" asChild><Link to="/">חזרה למרכז הידע</Link></Button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
              {department.name}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              {departmentArticles.length} מאמרים · {folders?.length || 0} תיקיות
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditingFolder(null); setFolderDialog(true); }}>
              <FolderPlus className="ms-1 sm:ms-2 h-4 w-4" />
              <span className="hidden sm:inline">תיקייה</span>
            </Button>
            <Button size="sm" onClick={() => { setEditingArticle(null); setArticleDialog(true); }}>
              <Plus className="ms-1 sm:ms-2 h-4 w-4" />
              <span className="hidden sm:inline">מאמר חדש</span>
              <span className="sm:hidden">חדש</span>
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חפש במחלקה..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Folder navigation chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFolderId(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
            activeFolderId === null
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          ללא תיקייה
          <span className="text-xs opacity-70">({looseCount})</span>
        </button>
        {folders?.map((f) => (
          <div key={f.id} className="group relative">
            <button
              onClick={() => setActiveFolderId(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeFolderId === f.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              <Folder className="h-3.5 w-3.5" />
              {f.name}
              <span className="text-xs opacity-70">({folderCounts[f.id] || 0})</span>
            </button>
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); setEditingFolder(f); setFolderDialog(true); }}
                className="absolute -top-1.5 -left-1.5 opacity-0 group-hover:opacity-100 bg-background border rounded-full p-0.5 shadow-sm transition-opacity"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Articles grid */}
      {isLoading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : visibleArticles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>אין מאמרים בתצוגה זו</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {visibleArticles.map((a) => (
            <ArticleCard
              key={a.id}
              article={a}
              onEdit={(art) => { setEditingArticle(art); setArticleDialog(true); }}
            />
          ))}
        </div>
      )}

      <ArticleDialog open={articleDialog} onOpenChange={setArticleDialog} article={editingArticle} />
      {departmentId && (
        <FolderDialog
          open={folderDialog}
          onOpenChange={setFolderDialog}
          folder={editingFolder}
          departmentId={departmentId}
        />
      )}
    </div>
  );
}
