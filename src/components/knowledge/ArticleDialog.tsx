import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { ArticleType, KnowledgeArticle, useSaveArticle, useDeleteArticle } from '@/hooks/useKnowledge';
import { useDepartments } from '@/hooks/useDepartments';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: KnowledgeArticle | null;
}

export function ArticleDialog({ open, onOpenChange, article }: Props) {
  const { data: departments } = useDepartments();
  const { data: employees } = useEmployees();
  const { profile } = useAuth();
  const save = useSaveArticle();

  const [title, setTitle] = useState('');
  const [articleType, setArticleType] = useState<ArticleType>('article');
  const [departmentId, setDepartmentId] = useState<string>('none');
  const [authorId, setAuthorId] = useState<string>('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    if (open) {
      setTitle(article?.title || '');
      setArticleType((article?.article_type as ArticleType) || 'article');
      setDepartmentId(article?.department_id || 'none');
      setAuthorId(article?.author_id || profile?.id || '');
      setContent(article?.content || '');
      setIsPinned(article?.is_pinned || false);
      setIsPublished(article?.is_published ?? true);
    }
  }, [open, article, profile?.id]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || departmentId === 'none' || !departmentId || !authorId) return;
    await save.mutateAsync({
      id: article?.id,
      title: title.trim(),
      article_type: articleType,
      department_id: departmentId,
      author_id: authorId,
      content: content.trim(),
      is_pinned: isPinned,
      is_published: isPublished,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{article ? 'עריכת מאמר' : 'מאמר חדש'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>כותרת *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>סוג *</Label>
              <Select value={articleType} onValueChange={(v) => setArticleType(v as ArticleType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">מאמר</SelectItem>
                  <SelectItem value="update">עדכון</SelectItem>
                  <SelectItem value="procedure">נוהל</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>מחלקה *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder="בחר מחלקה" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>כותב המאמר *</Label>
            <Select value={authorId} onValueChange={setAuthorId}>
              <SelectTrigger><SelectValue placeholder="בחר כותב" /></SelectTrigger>
              <SelectContent>
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>תוכן *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              dir="rtl"
              className="resize-y min-h-[200px]"
              placeholder="כתוב כאן את תוכן המאמר..."
            />
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={isPinned} onCheckedChange={setIsPinned} id="pinned" />
              <Label htmlFor="pinned">מוצמד לראש הדף</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} id="pub" />
              <Label htmlFor="pub">פורסם</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {article ? 'שמור שינויים' : 'פרסם מאמר'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
